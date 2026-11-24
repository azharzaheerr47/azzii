import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Images,
  Link2,
  Lock,
  Sparkles,
  Sticker,
} from 'lucide-react';
import { formatHeaderDate, formatNoteTimestamp } from '../lib/dateFormat';
import { buildInviteLink } from '../lib/inviteLink';
import type {
  ComplimentsOverview,
  PublicUser,
  SharedNote,
  SpaceSettings,
  SpaceStatus,
} from '../types/index';
import { api } from '../utils/apiClient';
import { CatDuoIllustration } from '../components/artwork/CatDuoIllustration';
import { PartnerAvatar } from '../components/artwork/PartnerAvatar';
import { SunflowerAccent } from '../components/artwork/SunflowerIllustration';
import type { AppRoute } from '../components/layout/AppShell';
import { NoteCard } from '../components/notes/NoteCard';
import { NoteComposer } from '../components/notes/NoteComposer';
import { NoteSkeletonList } from '../components/ui/SkeletonLoaders';
import { useToast } from '../components/ui/ToastProvider';

interface DashboardPageProps {
  user: PublicUser;
  members: PublicUser[];
  space: SpaceSettings;
  status: SpaceStatus;
  notes: SharedNote[];
  loadingNotes: boolean;
  onlineUserIds: string[];
  initialInviteCode: string | null;
  complimentsSummary: ComplimentsOverview | null;
  onNoteCreated: (note: SharedNote) => void;
  onNoteUpdated: (note: SharedNote) => void;
  onNoteDeleted: (note: SharedNote) => void;
  onOpenImage: (note: SharedNote, imageIndex: number) => void;
  onNavigate: (route: AppRoute) => void;
}

const DAILY_QUOTES = [
  'Little moments become favorite memories when kept together.',
  'Like sunflowers turning toward the sun, always finding warmth in each other.',
  'Even ordinary Tuesdays feel softer when we share a note.',
  'A private corner of calm, laughter, and reminders that you are loved.',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  members,
  space,
  status,
  notes,
  loadingNotes,
  onlineUserIds,
  initialInviteCode,
  complimentsSummary,
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  onOpenImage,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(initialInviteCode);
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const partner = members.find((m) => m.id !== user.id) ?? null;
  const activeNotes = useMemo(() => notes.filter((n) => !n.isDeleted), [notes]);
  const recentNotes = notes.slice(0, 6);

  const galleryItems = useMemo(
    () =>
      notes
        .filter((n) => !n.isDeleted && n.images.length > 0)
        .flatMap((n) =>
          n.images.map((img, idx) => ({
            note: n,
            image: img,
            indexInNote: idx,
          })),
        ),
    [notes],
  );
  const recentGallery = galleryItems.slice(0, 4);

  const dailyQuote = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];
  }, []);

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await api.rotateInvite();
      setInviteCode(res.inviteCode);
      showToast('Fresh partner invite link & code generated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create invite code.', 'error');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInvite = async (kind: 'code' | 'link') => {
    if (!inviteCode) return;
    const text =
      kind === 'link' ? buildInviteLink(window.location.origin, inviteCode) : inviteCode;
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedType(kind);
    showToast(
      kind === 'link' ? 'Invite link copied to clipboard.' : 'Invite code copied to clipboard.',
      'success',
    );
    window.setTimeout(() => setCopiedType((cur) => (cur === kind ? null : cur)), 2000);
  };

  const jarCount = complimentsSummary?.totalInJarForMe ?? 0;

  return (
    <div className="space-y-8">
      {/* Theme-Responsive Hero Section */}
      <section
        className="relative overflow-hidden border border-[var(--accent-border)] rounded-3xl p-6 sm:p-8 shadow-xs backdrop-blur-md transition-colors duration-300"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--bg-hero-from), var(--bg-hero-via), var(--bg-hero-to))',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1 font-medium text-[var(--accent-primary)]">
                <Lock className="w-3.5 h-3.5" />
                <span>Private space for two</span>
              </span>
              <span aria-hidden="true">·</span>
              <time className="tabular-nums">{formatHeaderDate()}</time>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] text-balance">
              {getGreeting()}, {user.name}
            </h1>
            <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
              {space.welcomeMessage}
            </p>
            <p className="text-xs italic text-[var(--text-muted)] pt-1">
              “{dailyQuote}”
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-3 bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl px-4 py-3 shadow-2xs">
              <div className="flex items-center -space-x-2">
                {members.map((m) => (
                  <PartnerAvatar
                    key={m.id}
                    name={m.name}
                    preset={m.avatarPreset}
                    avatarUrl={m.avatar}
                    size="sm"
                    isOnline={onlineUserIds.includes(m.id)}
                  />
                ))}
              </div>
              <div className="text-xs leading-snug">
                <p className="font-semibold text-[var(--text-primary)]">
                  {partner ? `${user.name} & ${partner.name}` : `${user.name} · Waiting for partner`}
                </p>
                <p className="text-[var(--text-muted)]">
                  {partner
                    ? partner.bio
                      ? partner.bio
                      : onlineUserIds.includes(partner.id)
                        ? `${partner.name} is here now`
                        : 'Shared space synced'
                    : '1 of 2 seats active'}
                </p>
              </div>
            </div>
            <SunflowerAccent className="hidden sm:block w-14 h-14 shrink-0" />
          </div>
        </div>
      </section>

      {/* Partner 2 Invite Banner (shown only while slot 2 is open) */}
      {status.userCount < status.maxUsers && (
        <section className="bg-[var(--accent-soft)] backdrop-blur-md border border-[var(--accent-border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
              Invite your partner to claim the second account
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Only one more account can ever join this space. Share a direct invite link or
              one-time code with them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {inviteCode ? (
              <>
                <code className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold tracking-wider text-[var(--text-primary)] tabular-nums">
                  {inviteCode}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyInvite('link')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-xs font-medium whitespace-nowrap"
                >
                  {copiedType === 'link' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'link' ? 'Link copied' : 'Copy invite link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyInvite('code')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--bg-hover)] whitespace-nowrap"
                >
                  {copiedType === 'code' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'code' ? 'Code copied' : 'Copy code'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={generatingInvite}
                onClick={handleGenerateInvite}
                className="px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-xs font-medium disabled:opacity-60 whitespace-nowrap"
              >
                {generatingInvite ? 'Generating...' : 'Create invite link'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Quick Access Grid */}
      <section aria-label="Quick access" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate('notes')}
          className="group text-left bg-[var(--bg-card)] backdrop-blur-md hover:bg-[var(--tile-notes-hover)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--tile-notes-bg)] flex items-center justify-center mb-3">
            <BookOpen className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            Our Notes
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] tabular-nums">
            {activeNotes.length} {activeNotes.length === 1 ? 'note' : 'notes'} shared
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('memories')}
          className="group text-left bg-[var(--bg-card)] backdrop-blur-md hover:bg-[var(--tile-memories-hover)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--tile-memories-bg)] flex items-center justify-center mb-3">
            <Images className="w-4 h-4 text-[var(--text-primary)]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            Our Memories
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] tabular-nums">
            {galleryItems.length} {galleryItems.length === 1 ? 'photo' : 'photos'} kept
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('jar')}
          className="group text-left bg-[var(--jar-card-bg)] backdrop-blur-md hover:opacity-95 border border-[var(--jar-card-border)] rounded-2xl p-4 sm:p-5 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--tile-jar-bg)] flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4 text-[var(--text-primary)]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            Compliments Jar
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] tabular-nums">
            {jarCount > 0 ? `${jarCount} waiting for you` : 'Pick or leave a love note'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('stickers')}
          className="group text-left bg-[var(--bg-card)] backdrop-blur-md hover:bg-[var(--tile-stickers-hover)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--tile-stickers-bg)] flex items-center justify-center mb-3">
            <Sticker className="w-4 h-4 text-[var(--text-primary)]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
            Stickers
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            17 custom keepsakes
          </p>
        </button>
      </section>

      {/* Main Content Grid: Composer + Feed on Left, Memories & Jar Snapshot on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <NoteComposer onCreated={onNoteCreated} />

          <section aria-labelledby="recent-notes-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="recent-notes-heading"
                className="font-display text-lg font-semibold text-[var(--text-primary)]"
              >
                Recent Notes
              </h2>
              {notes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('notes')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline whitespace-nowrap"
                >
                  <span>Browse all notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {loadingNotes ? (
              <NoteSkeletonList count={3} />
            ) : recentNotes.length === 0 ? (
              <div className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl p-8 text-center flex flex-col items-center">
                <CatDuoIllustration size="md" className="mb-4" />
                <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Your shared journal is ready
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)] max-w-sm">
                  Write your first note above, attach a favorite snapshot, or leave a sweet
                  sunflower sticker for your partner to find.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    currentUserId={user.id}
                    isAuthorOnline={onlineUserIds.includes(note.authorId)}
                    onUpdated={onNoteUpdated}
                    onDeleted={onNoteDeleted}
                    onOpenImage={onOpenImage}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: Memories Snapshot + Compliments Jar Invitation */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Recent Memories
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('memories')}
                className="text-xs font-medium text-[var(--accent-primary)] hover:underline whitespace-nowrap"
              >
                Open gallery
              </button>
            </div>

            {recentGallery.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed py-4">
                Photos uploaded in Memories or attached to notes will gather here as your shared
                keepsake wall.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {recentGallery.map((entry) => (
                  <button
                    key={entry.image.id}
                    type="button"
                    onClick={() => onOpenImage(entry.note, entry.indexInNote)}
                    aria-label={`View memory shared by ${entry.note.authorName} on ${formatNoteTimestamp(entry.note.createdAt)}`}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-input)] border border-[var(--border-subtle)]"
                  >
                    <img
                      src={entry.image.secureUrl}
                      alt={`Memory by ${entry.note.authorName}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[var(--jar-card-bg)] backdrop-blur-md border border-[var(--jar-card-border)] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Compliments Jar
              </h2>
              <Sparkles className="w-4 h-4 text-[var(--jar-icon)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {jarCount > 0
                ? `${jarCount} sweet ${jarCount === 1 ? 'note is' : 'notes are'} folded inside for you. Draw one whenever you need a smile.`
                : 'Tuck small reminders of why you adore each other inside the jar for sunny & rainy days alike.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('jar')}
              className="w-full py-2 px-3.5 rounded-xl bg-[var(--jar-btn-bg)] hover:bg-[var(--jar-btn-hover)] text-[var(--jar-btn-text)] text-xs font-semibold transition-colors"
            >
              {jarCount > 0 ? 'Pick a little note' : 'Open the jar'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};
