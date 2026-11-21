import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import { formatNoteTimestamp } from './lib/dateFormat';
import { upsertNoteIdempotent } from './lib/noteFilters';
import type {
  PublicUser,
  RealtimeEvent,
  SharedNote,
  SpaceSettings,
  SpaceStatus,
} from './types/index';
import { api } from './utils/apiClient';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { AppShell, type AppRoute } from './components/layout/AppShell';
import { ImageLightbox, type LightboxImageItem } from './components/ui/ImageLightbox';
import { PageSkeleton } from './components/ui/SkeletonLoaders';
import { ToastProvider, useToast } from './components/ui/ToastProvider';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';

type RoutePath = AppRoute | 'login' | 'not-found';

function parsePathToRoute(pathname: string): RoutePath {
  if (pathname === '/' || pathname === '') return 'dashboard';
  if (pathname === '/login') return 'login';
  if (pathname === '/notes') return 'notes';
  if (pathname === '/memories') return 'memories';
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
        <div className="min-h-screen bg-[#FAF9FE] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#6554A4]/20 rounded-2xl p-6 text-center">
            <h1 className="font-display text-xl font-bold text-[#29253A]">
              Something went sideways
            </h1>
            <p className="mt-2 text-sm text-[#645E7B]">
              {this.state.message || 'An unexpected display error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-4 py-2 rounded-xl bg-[#6554A4] text-white text-sm font-medium"
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
  const [route, setRoute] = useState<RoutePath>(() =>
    parsePathToRoute(window.location.pathname),
  );
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const [status, setStatus] = useState<SpaceStatus | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [space, setSpace] = useState<SpaceSettings | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [initialInviteCode, setInitialInviteCode] = useState<string | null>(null);

  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Lightbox state
  const [lightboxItems, setLightboxItems] = useState<LightboxImageItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const navigate = useCallback((nextRoute: RoutePath) => {
    setRoute(nextRoute);
    const nextPath = routeToPath(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parsePathToRoute(window.location.pathname));
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
    setMembers(me.members);
    setSpace(me.space);
    setStatus(me.status);
    setOnlineUserIds(me.onlineUserIds);

    if (!options?.silent) setLoadingNotes(true);
    try {
      const notesRes = await api.listNotes();
      setNotes(notesRes.notes);
    } finally {
      if (!options?.silent) setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const spaceStatus = await api.getAuthStatus();
        if (cancelled) return;
        setStatus(spaceStatus);

        if (spaceStatus.authenticated) {
          await loadAuthenticatedSpace();
          if (!cancelled && window.location.pathname === '/login') {
            navigate('dashboard');
          }
        } else if (!cancelled) {
          setUser(null);
        }
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : 'Unable to reach server.');
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAuthenticatedSpace, navigate]);

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case 'note:created':
      case 'note:updated':
      case 'note:deleted':
        setNotes((prev) => upsertNoteIdempotent(prev, event.payload));
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
    if (createdInviteCode) {
      setInitialInviteCode(createdInviteCode);
    }
    await loadAuthenticatedSpace();
    navigate('dashboard');
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setNotes([]);
    setInitialInviteCode(null);
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
      <div className="min-h-screen bg-[#FAF9FE] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#6554A4]/20 rounded-2xl p-6 text-center">
          <h1 className="font-display text-lg font-bold text-[#29253A]">
            Could not connect to Our Little Space
          </h1>
          <p className="mt-2 text-sm text-[#645E7B]">{bootError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 px-4 py-2 rounded-xl bg-[#6554A4] text-white text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!user || !space) {
    return <LoginPage status={status} onAuthenticated={handleAuthenticated} />;
  }

  const activeNavRoute: AppRoute =
    route === 'notes' || route === 'memories' || route === 'settings'
      ? route
      : 'dashboard';

  return (
    <>
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
            onOpenImage={handleOpenImage}
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
        <InnerApp />
      </ToastProvider>
    </ErrorBoundary>
  );
}
