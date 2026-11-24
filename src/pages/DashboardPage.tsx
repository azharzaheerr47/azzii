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
      {/* Sunflower-Warmed Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#FFF9EA]/90 via-white to-[#E9DFFF]/40 border border-[#F3BB38]/35 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#817B90]">
              <span className="inline-flex items-center gap-1 font-medium text-[#6554A4]">
                <Lock className="w-3.5 h-3.5" />
                <span>Private space for two</span>
              </span>
              <span aria-hidden="true">·</span>
              <time className="tabular-nums">{formatHeaderDate()}</time>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#29253A] text-balance">
              {getGreeting()}, {user.name}
            </h1>
            <p className="text-sm sm:text-[15px] text-[#817B90] leading-relaxed">
              {space.welcomeMessage}
            </p>
            <p className="text-xs italic text-[#817B90]/95 pt-1">
              “{dailyQuote}”
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-3 bg-white/95 border border-[#6554A4]/14 rounded-2xl px-4 py-3 shadow-2xs">
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
                <p className="font-semibold text-[#29253A]">
                  {partner ? `${user.name} & ${partner.name}` : `${user.name} · Waiting for partner`}
                </p>
                <p className="text-[#817B90]">
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
        <section className="bg-[#E9DFFF]/45 border border-[#BFA7F2]/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-[#29253A]">
              Invite your partner to claim the second account
            </h2>
            <p className="mt-0.5 text-xs text-[#817B90]">
              Only one more account can ever join this space. Share a direct invite link or
              one-time code with them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {inviteCode ? (
              <>
                <code className="px-3 py-1.5 rounded-xl bg-white border border-[#6554A4]/20 text-xs font-semibold tracking-wider text-[#29253A] tabular-nums">
                  {inviteCode}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyInvite('link')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6554A4] text-white text-xs font-medium hover:bg-[#534391] whitespace-nowrap"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#6554A4]/20 text-[#29253A] text-xs font-medium hover:bg-[#FCFAFF] whitespace-nowrap"
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
                className="px-3.5 py-2 rounded-xl bg-[#6554A4] text-white text-xs font-medium hover:bg-[#534391] disabled:opacity-60 whitespace-nowrap"
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
          className="group text-left bg-white hover:bg-[#E9DFFF]/30 border border-[#6554A4]/14 rounded-2xl p-4 sm:p-5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#E9DFFF]/70 flex items-center justify-center mb-3">
            <BookOpen className="w-4 h-4 text-[#6554A4]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[#29253A] group-hover:text-[#6554A4] transition-colors">
            Our Notes
          </h2>
          <p className="mt-0.5 text-xs text-[#817B90] tabular-nums">
            {activeNotes.length} {activeNotes.length === 1 ? 'note' : 'notes'} shared
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('memories')}
          className="group text-left bg-white hover:bg-[#FFD6E7]/30 border border-[#6554A4]/14 rounded-2xl p-4 sm:p-5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFD6E7]/75 flex items-center justify-center mb-3">
            <Images className="w-4 h-4 text-[#29253A]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[#29253A] group-hover:text-[#6554A4] transition-colors">
            Our Memories
          </h2>
          <p className="mt-0.5 text-xs text-[#817B90] tabular-nums">
            {galleryItems.length} {galleryItems.length === 1 ? 'photo' : 'photos'} kept
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('jar')}
          className="group text-left bg-[#FFF9EA]/70 hover:bg-[#FFF9EA] border border-[#F3BB38]/40 rounded-2xl p-4 sm:p-5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FFD45A]/75 flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4 text-[#29253A]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[#29253A] group-hover:text-[#6554A4] transition-colors">
            Compliments Jar
          </h2>
          <p className="mt-0.5 text-xs text-[#817B90] tabular-nums">
            {jarCount > 0 ? `${jarCount} waiting for you` : 'Pick or leave a love note'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('stickers')}
          className="group text-left bg-white hover:bg-[#D8E9FF]/40 border border-[#6554A4]/14 rounded-2xl p-4 sm:p-5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#D8E9FF]/80 flex items-center justify-center mb-3">
            <Sticker className="w-4 h-4 text-[#29253A]" />
          </div>
          <h2 className="font-display text-sm font-semibold text-[#29253A] group-hover:text-[#6554A4] transition-colors">
            Stickers
          </h2>
          <p className="mt-0.5 text-xs text-[#817B90]">
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
                className="font-display text-lg font-semibold text-[#29253A]"
              >
                Recent Notes
              </h2>
              {notes.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('notes')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6554A4] hover:underline whitespace-nowrap"
                >
                  <span>Browse all notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {loadingNotes ? (
              <NoteSkeletonList count={3} />
            ) : recentNotes.length === 0 ? (
              <div className="bg-white border border-[#6554A4]/14 rounded-2xl p-8 text-center flex flex-col items-center">
                <CatDuoIllustration size="md" className="mb-4" />
                <h3 className="font-display text-base font-semibold text-[#29253A]">
                  Your shared journal is ready
                </h3>
                <p className="mt-1 text-sm text-[#817B90] max-w-sm">
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
          <section className="bg-white border border-[#6554A4]/14 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold text-[#29253A]">
                Recent Memories
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('memories')}
                className="text-xs font-medium text-[#6554A4] hover:underline whitespace-nowrap"
              >
                Open gallery
              </button>
            </div>

            {recentGallery.length === 0 ? (
              <p className="text-xs text-[#817B90] leading-relaxed py-4">
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
                    className="group relative aspect-square rounded-xl overflow-hidden bg-[#FCFAFF] border border-[#6554A4]/10"
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

          <section className="bg-[#FFF9EA]/85 border border-[#F3BB38]/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#29253A]">
                Compliments Jar
              </h2>
              <Sparkles className="w-4 h-4 text-[#F3BB38]" />
            </div>
            <p className="text-xs text-[#817B90] leading-relaxed">
              {jarCount > 0
                ? `${jarCount} sweet ${jarCount === 1 ? 'note is' : 'notes are'} folded inside for you. Draw one whenever you need a smile.`
                : 'Tuck small reminders of why you adore each other inside the jar for sunny & rainy days alike.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('jar')}
              className="w-full py-2 px-3.5 rounded-xl bg-[#FFD45A] hover:bg-[#F3BB38] text-[#29253A] text-xs font-semibold transition-colors"
            >
              {jarCount > 0 ? 'Pick a little note' : 'Open the jar'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};
