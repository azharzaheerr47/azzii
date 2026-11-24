import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Heart, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { formatNoteTimestamp } from '../lib/dateFormat';
import { COMPLIMENT_CATEGORIES } from '../lib/validation';
import type {
  ComplimentCategory,
  ComplimentDrawResult,
  ComplimentsOverview,
  PublicUser,
} from '../types/index';
import { api } from '../utils/apiClient';
import { ComplimentJarIllustration } from '../components/artwork/ComplimentJarIllustration';
import { PartnerAvatar } from '../components/artwork/PartnerAvatar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastProvider';

interface ComplimentsJarPageProps {
  user: PublicUser;
  members: PublicUser[];
  refreshSignal?: number;
}

export const ComplimentsJarPage: React.FC<ComplimentsJarPageProps> = ({
  user,
  members,
  refreshSignal = 0,
}) => {
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  const partner = members.find((m) => m.id !== user.id) ?? null;

  const [overview, setOverview] = useState<ComplimentsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [revealed, setRevealed] = useState<ComplimentDrawResult | null>(null);

  // Add a little love modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ComplimentCategory>('Something I adore');
  const [savingCompliment, setSavingCompliment] = useState(false);

  // Lower history tabs
  const [activeTab, setActiveTab] = useState<'received' | 'written'>('received');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const data = await api.listCompliments();
      setOverview(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load compliments jar.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview, refreshSignal]);

  const handlePickNote = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const waitTime = prefersReducedMotion ? 100 : 520;
      const [result] = await Promise.all([
        api.drawCompliment(),
        new Promise((resolve) => window.setTimeout(resolve, waitTime)),
      ]);
      setRevealed(result);
      await loadOverview();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Ask your partner to drop a sweet note into the jar first.',
        'info',
      );
    } finally {
      setPicking(false);
    }
  };

  const handleCreateCompliment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSavingCompliment(true);
    try {
      await api.createCompliment({
        content: content.trim(),
        category,
      });
      setContent('');
      setCategory('Something I adore');
      setAddModalOpen(false);
      await loadOverview();
      showToast(
        partner
          ? `Dropped into ${partner.name}'s compliment jar.`
          : 'Saved into the jar for your partner.',
        'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save compliment.', 'error');
    } finally {
      setSavingCompliment(false);
    }
  };

  const handleDeleteCompliment = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await api.deleteCompliment(deleteTargetId);
      setDeleteTargetId(null);
      await loadOverview();
      showToast('Note removed from the jar.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove note.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalWaiting = overview?.totalInJarForMe ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#29253A]">
            Compliments Jar
          </h1>
          <p className="mt-1 text-sm text-[#817B90]">
            Folded little reminders and sweet notes tucked away for bright days and quiet nights.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-sm font-medium transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add a little love</span>
        </button>
      </div>

      {/* Main Interactive Jar Card */}
      <section className="bg-gradient-to-br from-[#FFF9EA]/90 via-white to-[#E9DFFF]/35 border border-[#F3BB38]/40 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Jar Illustration + Action */}
          <div className="lg:col-span-5 flex flex-col items-center text-center">
            <ComplimentJarIllustration
              noteCount={totalWaiting}
              isPicking={picking}
              className="w-48 h-56 sm:w-56 sm:h-64"
            />

            <div className="mt-3 space-y-1">
              {loading ? (
                <p className="text-xs text-[#817B90]">Checking what is inside your jar...</p>
              ) : totalWaiting === 0 ? (
                <>
                  <p className="font-display text-sm font-semibold text-[#29253A]">
                    Your jar is waiting for a little love.
                  </p>
                  <p className="text-xs text-[#817B90]">
                    {partner
                      ? `Ask ${partner.name} to drop a sweet note in here, or leave one for them first.`
                      : 'Invite your partner to join your space, or tuck notes inside for when they arrive.'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-[#817B90] tabular-nums">
                  {totalWaiting} {totalWaiting === 1 ? 'note' : 'notes'} from{' '}
                  <strong className="font-medium text-[#29253A]">
                    {partner?.name || 'your partner'}
                  </strong>{' '}
                  · {overview?.remainingInCycle ?? totalWaiting} left in this round
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={picking || loading || totalWaiting === 0}
                onClick={handlePickNote}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD45A] hover:bg-[#F3BB38] text-[#29253A] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>{picking ? 'Opening a note...' : 'Pick a little note'}</span>
              </button>
            </div>
          </div>

          {/* Right: Revealed Folded Note Display */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {revealed ? (
                <motion.div
                  key={revealed.draw.drawId}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="bg-[#FFF9EA] border border-[#F3BB38]/55 rounded-2xl p-6 sm:p-7 shadow-xs relative"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <PartnerAvatar
                        name={revealed.draw.compliment.authorName}
                        preset={revealed.draw.compliment.authorAvatarPreset}
                        avatarUrl={revealed.draw.compliment.authorAvatar}
                        size="sm"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-[#29253A]">
                          From {revealed.draw.compliment.authorName}
                        </p>
                        <p className="text-[#817B90]">
                          {revealed.draw.compliment.category} ·{' '}
                          <span className="tabular-nums">
                            {formatNoteTimestamp(revealed.draw.compliment.createdAt)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRevealed(null)}
                      aria-label="Close opened note"
                      className="p-1.5 rounded-lg text-[#817B90] hover:text-[#29253A] hover:bg-black/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <blockquote className="font-display text-lg sm:text-xl font-medium leading-relaxed text-[#29253A]">
                    “{revealed.draw.compliment.content}”
                  </blockquote>

                  <div className="mt-6 pt-4 border-t border-[#F3BB38]/30 flex flex-wrap items-center justify-between gap-3 text-xs text-[#817B90]">
                    <span>
                      {revealed.cycleReset
                        ? 'You saw every note from the last round — starting a fresh shuffle!'
                        : revealed.remainingInCycle === 0
                          ? 'That was the final unseen note in this round.'
                          : `${revealed.remainingInCycle} unseen ${revealed.remainingInCycle === 1 ? 'note' : 'notes'} left before reshuffle`}
                    </span>

                    {totalWaiting > 1 && (
                      <button
                        type="button"
                        disabled={picking}
                        onClick={handlePickNote}
                        className="inline-flex items-center gap-1.5 font-medium text-[#6554A4] hover:underline"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Pick another</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="jar-prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/85 border border-dashed border-[#6554A4]/20 rounded-2xl p-6 sm:p-8 text-center space-y-2.5"
                >
                  <div className="w-10 h-10 rounded-full bg-[#FFF9EA] border border-[#F3BB38]/50 flex items-center justify-center mx-auto">
                    <Heart className="w-4 h-4 text-[#F3BB38]" />
                  </div>
                  <h2 className="font-display text-base font-semibold text-[#29253A]">
                    {totalWaiting > 0
                      ? 'Ready whenever you need a smile'
                      : 'Keep this jar full of small kindnesses'}
                  </h2>
                  <p className="text-sm text-[#817B90] max-w-md mx-auto leading-relaxed">
                    {totalWaiting > 0
                      ? 'Click “Pick a little note” to unfold a surprise written just for you. Each round cycles through every note without repeats.'
                      : 'Notes you add go straight into your partner’s jar—hidden until they pull one out at random.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* History & Written Notes Section */}
      <section className="space-y-4">
        <div
          className="inline-flex items-center gap-1 p-1 bg-white border border-[#6554A4]/14 rounded-xl"
          role="tablist"
          aria-label="Compliments jar lists"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'received'}
            onClick={() => setActiveTab('received')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'received'
                ? 'bg-[#FFF9EA] text-[#29253A] ring-1 ring-[#F3BB38]/50'
                : 'text-[#817B90] hover:text-[#29253A]'
            }`}
          >
            Opened notes ({overview?.drawnHistory.length ?? 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'written'}
            onClick={() => setActiveTab('written')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'written'
                ? 'bg-[#E9DFFF]/70 text-[#29253A]'
                : 'text-[#817B90] hover:text-[#29253A]'
            }`}
          >
            Written by you ({overview?.writtenByMe.length ?? 0})
          </button>
        </div>

        {activeTab === 'received' ? (
          (overview?.drawnHistory.length ?? 0) === 0 ? (
            <div className="bg-white border border-[#6554A4]/14 rounded-2xl p-8 text-center text-sm text-[#817B90]">
              Notes you draw from the jar will stay gathered here so you can revisit them anytime.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overview?.drawnHistory.map((entry) => (
                <article
                  key={entry.drawId}
                  className="bg-white border border-[#6554A4]/14 rounded-2xl p-5 flex flex-col justify-between gap-3"
                >
                  <p className="text-[15px] leading-relaxed text-[#29253A]">
                    “{entry.compliment.content}”
                  </p>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#817B90]">
                    <span>
                      From <strong className="font-medium text-[#29253A]">{entry.compliment.authorName}</strong> ·{' '}
                      {entry.compliment.category}
                    </span>
                    <time className="tabular-nums shrink-0">
                      Opened {formatNoteTimestamp(entry.drawnAt)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : (overview?.writtenByMe.length ?? 0) === 0 ? (
          <div className="bg-white border border-[#6554A4]/14 rounded-2xl p-8 text-center space-y-3">
            <p className="text-sm text-[#817B90]">
              You haven&apos;t tucked any notes into{' '}
              {partner ? `${partner.name}'s` : "your partner's"} jar yet.
            </p>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#6554A4] text-white text-xs font-medium hover:bg-[#534391]"
            >
              Write your first compliment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview?.writtenByMe.map((item) => (
              <article
                key={item.id}
                className="bg-white border border-[#6554A4]/14 rounded-2xl p-5 flex items-start justify-between gap-3"
              >
                <div className="space-y-2 min-w-0">
                  <p className="text-[15px] leading-relaxed text-[#29253A] break-words">
                    “{item.content}”
                  </p>
                  <p className="text-xs text-[#817B90]">
                    For {partner ? partner.name : 'your partner'} · {item.category} ·{' '}
                    <span className="tabular-nums">{formatNoteTimestamp(item.createdAt)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(item.id)}
                  aria-label="Delete your compliment note"
                  className="p-2 rounded-xl text-[#817B90] hover:text-[#B91C1C] hover:bg-[#B91C1C]/8 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Add a Little Love Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#29253A]/45 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-compliment-title"
        >
          <div className="max-w-lg w-full bg-white border border-[#6554A4]/16 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="add-compliment-title"
                  className="font-display text-lg font-bold text-[#29253A]"
                >
                  Add a little love
                </h2>
                <p className="mt-0.5 text-xs text-[#817B90]">
                  {partner
                    ? `For ${partner.name} — kept hidden until they pick a note from the jar.`
                    : 'Saved for your partner — it will wait inside their jar as soon as they join.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-[#817B90] hover:text-[#29253A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompliment} className="mt-5 space-y-4">
              <div>
                <span className="block text-xs font-medium text-[#29253A] mb-2">
                  Little theme
                </span>
                <div className="flex flex-wrap gap-2">
                  {COMPLIMENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={category === cat}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        category === cat
                          ? 'bg-[#FFF9EA] border-[#F3BB38] text-[#29253A]'
                          : 'bg-white border-[#6554A4]/15 text-[#817B90] hover:text-[#29253A]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="compliment-message-input"
                  className="block text-xs font-medium text-[#29253A] mb-1.5"
                >
                  Your note
                </label>
                <textarea
                  id="compliment-message-input"
                  required
                  minLength={2}
                  maxLength={500}
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write something you adore about them, a memory that makes you smile, or a gentle reminder..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#6554A4]/20 bg-[#FCFAFF] text-sm text-[#29253A] placeholder:text-[#817B90]/75 focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
                />
                <div className="mt-1 text-right text-[11px] text-[#817B90] tabular-nums">
                  {content.length}/500
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#817B90] hover:bg-[#FCFAFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCompliment || content.trim().length < 2}
                  className="px-4 py-2.5 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-xs font-semibold transition-colors disabled:opacity-55"
                >
                  {savingCompliment ? 'Folding note...' : 'Drop into the jar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title="Remove this jar note?"
        description="This note will be permanently removed from your partner's jar."
        confirmLabel="Remove note"
        isDanger
        busy={deleting}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteCompliment}
      />
    </div>
  );
};
