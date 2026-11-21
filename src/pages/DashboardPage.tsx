import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Lock } from 'lucide-react';
import { formatHeaderDate, formatNoteTimestamp } from '../lib/dateFormat';
import type { PublicUser, SharedNote, SpaceSettings, SpaceStatus } from '../types/index';
import { api } from '../utils/apiClient';
import { CatDuoIllustration } from '../components/artwork/CatDuoIllustration';
import { PartnerAvatar } from '../components/artwork/PartnerAvatar';
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
  onNoteCreated: (note: SharedNote) => void;
  onNoteUpdated: (note: SharedNote) => void;
  onNoteDeleted: (note: SharedNote) => void;
  onOpenImage: (note: SharedNote, imageIndex: number) => void;
  onNavigate: (route: AppRoute) => void;
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
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  onOpenImage,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [inviteCode, setInviteCode] = useState<string | null>(initialInviteCode);
  const [copied, setCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const partner = members.find((m) => m.id !== user.id) ?? null;
  const recentNotes = notes.slice(0, 8);

  const galleryItems = notes
    .filter((n) => !n.isDeleted && n.images.length > 0)
    .flatMap((n) =>
      n.images.map((img, idx) => ({
        note: n,
        image: img,
        indexInNote: idx,
      })),
    )
    .slice(0, 6);

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await api.rotateInvite();
      setInviteCode(res.inviteCode);
      showToast('Fresh partner invite code generated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not create invite code.', 'error');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode).catch(() => undefined);
    setCopied(true);
    showToast('Invite code copied to clipboard.', 'success');
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Personal Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#6554A4]/12">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#645E7B]">
            <span className="inline-flex items-center gap-1 font-medium text-[#6554A4]">
              <Lock className="w-3.5 h-3.5" />
              <span>Private space for two</span>
            </span>
            <span aria-hidden="true">·</span>
            <time className="tabular-nums">{formatHeaderDate()}</time>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#29253A] text-balance">
            Hi {user.name}, welcome to {space.spaceName}
          </h1>
          <p className="text-sm sm:text-[15px] text-[#645E7B] leading-relaxed">
            {space.welcomeMessage}
          </p>
        </div>

        {/* Partner Avatars Duo */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2 bg-white border border-[#6554A4]/14 rounded-2xl px-3.5 py-2">
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
            <div className="text-xs leading-tight pl-1">
              <p className="font-semibold text-[#29253A]">
                {partner ? `${user.name} & ${partner.name}` : `${user.name} · Waiting for partner`}
              </p>
              <p className="text-[#645E7B]">
                {partner
                  ? onlineUserIds.includes(partner.id)
                    ? `${partner.name} is here now`
                    : 'Shared space synced'
                  : '1 of 2 seats active'}
              </p>
            </div>
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
            <p className="mt-0.5 text-xs text-[#645E7B]">
              Only one more account can ever join this space. Share a one-time invite code with
              them.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {inviteCode ? (
              <>
                <code className="px-3 py-1.5 rounded-xl bg-white border border-[#6554A4]/20 text-xs font-semibold tracking-wider text-[#29253A] tabular-nums">
                  {inviteCode}
                </code>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6554A4] text-white text-xs font-medium hover:bg-[#534391] whitespace-nowrap"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={generatingInvite}
                onClick={handleGenerateInvite}
                className="px-3.5 py-2 rounded-xl bg-[#6554A4] text-white text-xs font-medium hover:bg-[#534391] disabled:opacity-60 whitespace-nowrap"
              >
                {generatingInvite ? 'Generating...' : 'Generate invite code'}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Main Content Grid: Composer + Feed on Left, Memories & Space Summary on Right */}
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
                <p className="mt-1 text-sm text-[#645E7B] max-w-sm">
                  Write your first note above, attach a favorite snapshot, or leave a cute cat
                  sticker for your partner to find.
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

        {/* Sidebar: Memories Snapshot */}
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

            {galleryItems.length === 0 ? (
              <p className="text-xs text-[#645E7B] leading-relaxed py-4">
                Photos attached to your notes will appear here as a shared visual keepsake
                wall.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {galleryItems.map((entry) => (
                  <button
                    key={entry.image.id}
                    type="button"
                    onClick={() => onOpenImage(entry.note, entry.indexInNote)}
                    aria-label={`View memory shared by ${entry.note.authorName} on ${formatNoteTimestamp(entry.note.createdAt)}`}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-[#FAF9FE] border border-[#6554A4]/10"
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
        </aside>
      </div>
    </div>
  );
};
