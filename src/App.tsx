import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { formatNoteTimestamp } from './lib/dateFormat';
import { extractInviteCodeFromSearch } from './lib/inviteLink';
import { upsertNoteIdempotent } from './lib/noteFilters';
import type {
  ComplimentsOverview,
  PublicUser,
  RealtimeEvent,
  SharedNote,
  SpaceSettings,
  SpaceStatus,
  StickerId,
} from './types/index';
import { api, ApiRequestError } from './utils/apiClient';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { SunflowerBloomIntro } from './components/artwork/SunflowerIllustration';
import { AppShell, type AppRoute } from './components/layout/AppShell';
import { ThemeProvider, useTheme } from './components/theme/ThemeProvider';
import { ImageLightbox, type LightboxImageItem } from './components/ui/ImageLightbox';
import { PageSkeleton } from './components/ui/SkeletonLoaders';
import { ToastProvider, useToast } from './components/ui/ToastProvider';
import { ComplimentsJarPage } from './pages/ComplimentsJarPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { StickersPage } from './pages/StickersPage';

type RoutePath = AppRoute | 'login' | 'not-found';

function parsePathToRoute(pathname: string): RoutePath {
  if (pathname === '/' || pathname === '') return 'dashboard';
  if (pathname === '/login' || pathname === '/join') return 'login';
  if (pathname === '/notes') return 'notes';
  if (pathname === '/memories') return 'memories';
  if (pathname === '/jar') return 'jar';
  if (pathname === '/stickers') return 'stickers';
  if (pathname === '/settings') return 'settings';
  return 'not-found';
}

function routeToPath(route: RoutePath): string {
  switch (route) {
    case 'dashboard':
      return '/';
    case 'login':
      return '/login';
    case 'notes':
      return '/notes';
    case 'memories':
      return '/memories';
    case 'jar':
      return '/jar';
    case 'stickers':
      return '/stickers';
    case 'settings':
      return '/settings';
    default:
      return '/404';
  }
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 text-center">
            <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">
              Something went sideways
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {this.state.message || 'An unexpected display error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-sm font-medium transition-colors"
            >
              Reload space
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function InnerApp() {
  const { showToast } = useToast();
  const { syncFromUser } = useTheme();
  const [route, setRoute] = useState<RoutePath>(() =>
    parsePathToRoute(window.location.pathname),
  );
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<{
    title: string;
    message: string;
    detail?: string;
  } | null>(null);

  const [status, setStatus] = useState<SpaceStatus | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [space, setSpace] = useState<SpaceSettings | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [initialInviteCode, setInitialInviteCode] = useState<string | null>(null);
  const [urlInviteCode, setUrlInviteCode] = useState<string | null>(() =>
    extractInviteCodeFromSearch(window.location.search),
  );

  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [complimentsSummary, setComplimentsSummary] = useState<ComplimentsOverview | null>(null);
  const [complimentRefreshSignal, setComplimentRefreshSignal] = useState(0);
  const [preselectedSticker, setPreselectedSticker] = useState<StickerId | null>(null);

  // Signature Sunflower Bloom Intro (runs once per interactive sign-in / sign-up)
  const [showBloomIntro, setShowBloomIntro] = useState(false);

  // Lightbox state
  const [lightboxItems, setLightboxItems] = useState<LightboxImageItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const navigate = useCallback((nextRoute: RoutePath) => {
    setRoute(nextRoute);
    const nextPath = routeToPath(nextRoute);
    if (window.location.pathname !== nextPath || window.location.search !== '') {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parsePathToRoute(window.location.pathname));
      setUrlInviteCode(extractInviteCodeFromSearch(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // SEO robots tag governance: noindex all private pages when signed in
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    if (user) {
      robotsMeta.setAttribute('content', 'noindex, nofollow');
      document.title = `${space?.spaceName || 'Our Little Space'}`;
    } else {
      robotsMeta.setAttribute('content', 'index, follow');
      document.title = 'Our Little Space – Private Shared Journal & Memories for Two';
    }
  }, [user, space?.spaceName]);

  const loadAuthenticatedSpace = useCallback(async (options?: { silent?: boolean }) => {
    const me = await api.getMe();
    setUser(me.user);
    syncFromUser(me.user);
    setMembers(me.members);
    setSpace(me.space);
    setStatus(me.status);
    setOnlineUserIds(me.onlineUserIds);

    if (!options?.silent) setLoadingNotes(true);
    try {
      const [notesRes, complimentsRes] = await Promise.all([
        api.listNotes(),
        api.listCompliments().catch(() => null),
      ]);
      setNotes(notesRes.notes);
      if (complimentsRes) setComplimentsSummary(complimentsRes);
    } finally {
      if (!options?.silent) setLoadingNotes(false);
    }
  }, [syncFromUser]);

  const runBootCheck = useCallback(
    async (isCancelled?: () => boolean) => {
      setBootLoading(true);
      setBootError(null);
      try {
        const spaceStatus = await api.getAuthStatus();
        if (isCancelled?.()) return;
        setStatus(spaceStatus);

        if (spaceStatus.authenticated) {
          await loadAuthenticatedSpace();
          if (
            !isCancelled?.() &&
            (window.location.pathname === '/login' ||
              window.location.pathname === '/join' ||
              window.location.search !== '')
          ) {
            setUrlInviteCode(null);
            navigate('dashboard');
          }
        } else if (!isCancelled?.()) {
          setUser(null);
          syncFromUser(null);
        }
      } catch (err) {
        if (isCancelled?.()) return;
        if (err instanceof ApiRequestError) {
          const title =
            err.status === 404
              ? 'Backend endpoint not found (404)'
              : err.kind === 'database' || err.status === 503
                ? 'Database connection unavailable'
                : err.kind === 'invalid_response'
                  ? 'Unexpected server response'
                  : err.kind === 'network'
                    ? 'Could not connect to Our Little Space'
                    : `Server error (${err.status ?? '500'})`;
          setBootError({
            title,
            message: err.message,
            detail: `${err.method} ${err.endpoint}${err.status ? ` · HTTP ${err.status}` : ''}`,
          });
        } else {
          setBootError({
            title: 'Could not connect to Our Little Space',
            message: err instanceof Error ? err.message : 'Unable to reach server.',
          });
        }
      } finally {
        if (!isCancelled?.()) setBootLoading(false);
      }
    },
    [loadAuthenticatedSpace, navigate, syncFromUser],
  );

  useEffect(() => {
    let cancelled = false;
    runBootCheck(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [runBootCheck]);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case 'note:created':
      case 'note:updated':
      case 'note:deleted':
        setNotes((prev) => upsertNoteIdempotent(prev, event.payload));
        break;
      case 'compliment:created':
      case 'compliment:deleted':
        setComplimentRefreshSignal((c) => c + 1);
        api
          .listCompliments()
          .then(setComplimentsSummary)
          .catch(() => undefined);
        break;
      case 'space:updated':
        setSpace(event.payload);
        break;
      case 'user:updated':
        setMembers((prev) => {
          const exists = prev.some((m) => m.id === event.payload.id);
          const next = exists
            ? prev.map((m) => (m.id === event.payload.id ? event.payload : m))
            : [...prev, event.payload];
          setStatus((s) =>
            s
              ? {
                  ...s,
                  userCount: Math.max(s.userCount, next.length),
                  hasOpenInvite: next.length < s.maxUsers ? s.hasOpenInvite : false,
                }
              : s,
          );
          return next;
        });
        setUser((prev) => (prev && prev.id === event.payload.id ? event.payload : prev));
        setNotes((prev) =>
          prev.map((n) =>
            n.authorId === event.payload.id
              ? {
                  ...n,
                  authorName: event.payload.name,
                  authorAvatar: event.payload.avatar,
                  authorAvatarPreset: event.payload.avatarPreset,
                }
              : n,
          ),
        );
        break;
      case 'presence:update':
        setOnlineUserIds(event.payload.onlineUserIds);
        break;
    }
  }, []);

  const handleReconnectRefresh = useCallback(() => {
    loadAuthenticatedSpace({ silent: true }).catch(() => undefined);
  }, [loadAuthenticatedSpace]);

  useRealtimeSync(
    Boolean(user),
    handleRealtimeEvent,
    handleReconnectRefresh,
    status?.realtimeMode ?? 'ws',
  );

  const handleAuthenticated = async (
    _authedUser: PublicUser,
    createdInviteCode?: string,
  ) => {
    const skipIntro = window.location.search.includes('autostart=1');
    setUrlInviteCode(null);
    if (createdInviteCode) {
      setInitialInviteCode(createdInviteCode);
    }
    await loadAuthenticatedSpace();
    if (!skipIntro) {
      setShowBloomIntro(true);
    }
    navigate('dashboard');
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    syncFromUser(null);
    setNotes([]);
    setComplimentsSummary(null);
    setInitialInviteCode(null);
    setUrlInviteCode(null);
    setShowBloomIntro(false);
    const freshStatus = await api.getAuthStatus().catch(() => status);
    if (freshStatus) setStatus(freshStatus);
    navigate('login');
    showToast('Signed out safely.', 'info');
  };

  const allGalleryLightboxItems = useMemo<LightboxImageItem[]>(() => {
    return notes
      .filter((n) => !n.isDeleted && n.images.length > 0)
      .flatMap((n) =>
        n.images.map((img) => ({
          id: img.id,
          secureUrl: img.secureUrl,
          caption: n.content || undefined,
          meta: `${n.authorName} · ${formatNoteTimestamp(n.createdAt)}`,
        })),
      );
  }, [notes]);

  const handleOpenImage = useCallback(
    (note: SharedNote, imageIndex: number) => {
      const targetImg = note.images[imageIndex];
      if (!targetImg) return;
      const globalIdx = allGalleryLightboxItems.findIndex((i) => i.id === targetImg.id);
      if (globalIdx !== -1) {
        setLightboxItems(allGalleryLightboxItems);
        setLightboxIndex(globalIdx);
      } else {
        setLightboxItems(
          note.images.map((img) => ({
            id: img.id,
            secureUrl: img.secureUrl,
            caption: note.content || undefined,
            meta: `${note.authorName} · ${formatNoteTimestamp(note.createdAt)}`,
          })),
        );
        setLightboxIndex(imageIndex);
      }
    },
    [allGalleryLightboxItems],
  );

  if (bootLoading) {
    return <PageSkeleton />;
  }

  if (bootError || !status) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 text-center">
          <h1 className="font-display text-lg font-bold text-[var(--text-primary)]">
            {bootError?.title || 'Could not connect to Our Little Space'}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {bootError?.message || 'Unable to load application status.'}
          </p>
          {bootError?.detail && (
            <p className="mt-2 text-xs text-[var(--text-muted)] font-mono">{bootError.detail}</p>
          )}
          <button
            type="button"
            onClick={() => runBootCheck()}
            className="mt-5 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!user || !space) {
    return (
      <LoginPage
        status={status}
        initialInviteCode={urlInviteCode}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const activeNavRoute: AppRoute =
    route === 'notes' ||
    route === 'memories' ||
    route === 'jar' ||
    route === 'stickers' ||
    route === 'settings'
      ? route
      : 'dashboard';

  return (
    <>
      <AnimatePresence>
        {showBloomIntro && (
          <SunflowerBloomIntro
            spaceName={space.spaceName}
            userName={user.name}
            onComplete={() => setShowBloomIntro(false)}
          />
        )}
      </AnimatePresence>

      <AppShell
        currentRoute={activeNavRoute}
        onNavigate={navigate}
        space={space}
        user={user}
        members={members}
        onlineUserIds={onlineUserIds}
        onLogout={handleLogout}
      >
        {route === 'dashboard' && (
          <DashboardPage
            user={user}
            members={members}
            space={space}
            status={status}
            notes={notes}
            loadingNotes={loadingNotes}
            onlineUserIds={onlineUserIds}
            initialInviteCode={initialInviteCode}
            complimentsSummary={complimentsSummary}
            onNoteCreated={(n) => setNotes((prev) => upsertNoteIdempotent(prev, n))}
            onNoteUpdated={(n) => setNotes((prev) => upsertNoteIdempotent(prev, n))}
            onNoteDeleted={(n) => setNotes((prev) => upsertNoteIdempotent(prev, n))}
            onOpenImage={handleOpenImage}
            onNavigate={navigate}
          />
        )}

        {route === 'notes' && (
          <NotesPage
            user={user}
            members={members}
            notes={notes}
            loadingNotes={loadingNotes}
            onlineUserIds={onlineUserIds}
            initialSticker={preselectedSticker}
            onConsumeInitialSticker={() => setPreselectedSticker(null)}
            onNoteCreated={(n) => setNotes((prev) => upsertNoteIdempotent(prev, n))}
            onNoteUpdated={(n) => setNotes((prev) => upsertNoteIdempotent(prev, n))}
            onNoteDeleted={(n) => setNotes((prev) => upsertNoteIdempotent(prev, n))}
            onOpenImage={handleOpenImage}
          />
        )}

        {route === 'memories' && (
          <MemoriesPage
            members={members}
            notes={notes}
            onNoteCreated={(n) => setNotes((prev) => upsertNoteIdempotent(prev, n))}
            onOpenImage={handleOpenImage}
          />
        )}

        {route === 'jar' && (
          <ComplimentsJarPage
            user={user}
            members={members}
            refreshSignal={complimentRefreshSignal}
          />
        )}

        {route === 'stickers' && (
          <StickersPage
            onUseStickerInNote={(stickerId) => {
              setPreselectedSticker(stickerId);
              navigate('notes');
            }}
          />
        )}

        {route === 'settings' && (
          <SettingsPage
            user={user}
            members={members}
            space={space}
            status={status}
            onSpaceUpdated={setSpace}
            onUserUpdated={(updated) => {
              setUser(updated);
              setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            }}
            onLogout={handleLogout}
          />
        )}

        {route === 'not-found' && (
          <NotFoundPage onGoHome={() => navigate('dashboard')} />
        )}
      </AppShell>

      <ImageLightbox
        images={lightboxItems}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ThemeProvider>
          <InnerApp />
        </ThemeProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
