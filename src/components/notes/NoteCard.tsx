import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Pencil, Smile, Trash2, X } from 'lucide-react';
import { formatNoteTimestamp } from '../../lib/dateFormat';
import { canUserMutateNote } from '../../lib/noteFilters';
import type { NoteTone, SharedNote, StickerId } from '../../types/index';
import { api } from '../../utils/apiClient';
import { PartnerAvatar } from '../artwork/PartnerAvatar';
import { StickerArtwork, StickerPicker, getStickerLabel } from '../artwork/StickerCollection';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/ToastProvider';

interface NoteCardProps {
  note: SharedNote;
  currentUserId: string;
  isAuthorOnline?: boolean;
  onUpdated: (note: SharedNote) => void;
  onDeleted: (note: SharedNote) => void;
  onOpenImage: (note: SharedNote, imageIndex: number) => void;
}

const CARD_TONE_STYLES: Record<NoteTone, { backgroundColor: string; borderColor: string }> = {
  white: {
    backgroundColor: 'var(--note-white-bg)',
    borderColor: 'var(--note-white-border)',
  },
  lavender: {
    backgroundColor: 'var(--note-lavender-bg)',
    borderColor: 'var(--note-lavender-border)',
  },
  pink: {
    backgroundColor: 'var(--note-pink-bg)',
    borderColor: 'var(--note-pink-border)',
  },
  blue: {
    backgroundColor: 'var(--note-blue-bg)',
    borderColor: 'var(--note-blue-border)',
  },
};

const TONE_SWATCHES: { id: NoteTone; label: string; bgVar: string }[] = [
  { id: 'white', label: 'White', bgVar: 'var(--note-white-bg)' },
  { id: 'lavender', label: 'Lavender', bgVar: 'var(--note-lavender-bg)' },
  { id: 'pink', label: 'Pink', bgVar: 'var(--note-pink-bg)' },
  { id: 'blue', label: 'Blue', bgVar: 'var(--note-blue-bg)' },
];

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  currentUserId,
  isAuthorOnline,
  onUpdated,
  onDeleted,
  onOpenImage,
}) => {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(note.content);
  const [draftTone, setDraftTone] = useState<NoteTone>(note.tone);
  const [draftSticker, setDraftSticker] = useState<StickerId | null>(note.sticker);
  const [showEditStickers, setShowEditStickers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canMutate = canUserMutateNote(note, currentUserId);

  if (note.isDeleted) {
    return (
      <article
        className="bg-[var(--bg-surface)] backdrop-blur-md border border-dashed border-[var(--border-strong)] rounded-2xl px-4 py-3.5 text-sm text-[var(--text-secondary)]"
        aria-label={`Deleted note by ${note.authorName}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="italic text-[var(--text-secondary)]">This note was deleted by its author.</p>
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            {note.authorName}
            {note.deletedAt ? ` · Deleted ${formatNoteTimestamp(note.deletedAt)}` : ''}
          </span>
        </div>
      </article>
    );
  }

  const startEditing = () => {
    setDraftContent(note.content);
    setDraftTone(note.tone);
    setDraftSticker(note.sticker);
    setEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim() && note.images.length === 0 && !draftSticker) {
      showToast('Note cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { note: updated } = await api.updateNote(note.id, {
        content: draftContent.trim(),
        tone: draftTone,
        sticker: draftSticker,
      });
      onUpdated(updated);
      setEditing(false);
      setShowEditStickers(false);
      showToast('Note updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update note.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const { note: deleted } = await api.softDeleteNote(note.id);
      setConfirmDeleteOpen(false);
      onDeleted(deleted);
      showToast('Note deleted.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete note.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const createdLabel = formatNoteTimestamp(note.createdAt);
  const editedLabel = note.updatedAt ? formatNoteTimestamp(note.updatedAt) : null;
  const toneStyle = CARD_TONE_STYLES[note.tone] ?? CARD_TONE_STYLES.white;

  return (
    <>
      <motion.article
        layout="position"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={toneStyle}
        className={`relative ${
          editing ? 'z-20' : ''
        } border rounded-2xl p-4 sm:p-5 backdrop-blur-md transition-[shadow,background-color,border-color] duration-200 hover:shadow-sm`}
      >
        {/* Header Metadata (Zero-Pill clean unboxed typography) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PartnerAvatar
              name={note.authorName}
              preset={note.authorAvatarPreset}
              avatarUrl={note.authorAvatar}
              size="sm"
              isOnline={isAuthorOnline}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
                <span className="font-semibold text-[var(--text-primary)] truncate">
                  {note.authorName}
                </span>
                <span aria-hidden="true" className="text-[var(--text-muted)]">
                  ·
                </span>
                <time
                  dateTime={note.createdAt}
                  className="text-xs text-[var(--text-secondary)] tabular-nums"
                >
                  {createdLabel}
                </time>
                {editedLabel && (
                  <>
                    <span aria-hidden="true" className="text-[var(--text-muted)]">
                      ·
                    </span>
                    <span
                      className="text-xs font-medium text-[var(--accent-primary)]"
                      title={`Last edited ${editedLabel}`}
                    >
                      Edited
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {canMutate && !editing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={startEditing}
                aria-label={`Edit note by ${note.authorName} from ${createdLabel}`}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label={`Delete note by ${note.authorName} from ${createdLabel}`}
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {editing ? (
          <form onSubmit={handleSaveEdit} className="mt-3 space-y-3">
            <label htmlFor={`edit-note-${note.id}`} className="sr-only">
              Edit note text
            </label>
            <textarea
              id={`edit-note-${note.id}`}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={3}
              maxLength={4000}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl p-3 text-[15px] leading-relaxed text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 relative">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditStickers((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)]"
                >
                  <Smile className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>{draftSticker ? getStickerLabel(draftSticker) : 'Sticker'}</span>
                </button>
                {draftSticker && (
                  <button
                    type="button"
                    onClick={() => setDraftSticker(null)}
                    aria-label="Remove sticker"
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {showEditStickers && (
                  <div className="absolute left-0 top-10 z-30">
                    <StickerPicker
                      selected={draftSticker}
                      onSelect={setDraftSticker}
                      onClose={() => setShowEditStickers(false)}
                    />
                  </div>
                )}
                <div className="flex items-center gap-1 pl-2 border-l border-[var(--border-subtle)]">
                  {TONE_SWATCHES.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => setDraftTone(sw.id)}
                      aria-label={`Set note tone to ${sw.label}`}
                      style={{ backgroundColor: sw.bgVar }}
                      className={`w-5 h-5 rounded-full border border-[var(--border-strong)] ${
                        draftTone === sw.id ? 'ring-2 ring-[var(--ring-focus)]' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setShowEditStickers(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-xs font-medium disabled:opacity-60 whitespace-nowrap"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {note.content && (
                <p className="text-[15px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words">
                  {note.content}
                </p>
              )}
            </div>
            {note.sticker && (
              <div className="shrink-0" title={getStickerLabel(note.sticker)}>
                <StickerArtwork sticker={note.sticker} className="w-14 h-14 sm:w-16 sm:h-16" />
              </div>
            )}
          </div>
        )}

        {/* Images */}
        {note.images.length > 0 && (
          <div
            className={`mt-3.5 grid gap-2 ${
              note.images.length === 1
                ? 'grid-cols-1'
                : note.images.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {note.images.map((img, index) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onOpenImage(note, index)}
                aria-label={`Open image ${index + 1} from ${note.authorName}'s note`}
                className={`group relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] block text-left ${
                  note.images.length === 1 ? 'aspect-16/10 max-h-72 w-full sm:max-w-lg' : 'aspect-4/3'
                }`}
              >
                <img
                  src={img.secureUrl}
                  alt={note.content ? `Memory photo: ${note.content.slice(0, 60)}` : 'Shared memory photo'}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </button>
            ))}
          </div>
        )}
      </motion.article>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this note?"
        description="A quiet notice will remain in the timeline letting both of you know this note was deleted by its author. Any attached photos will also be removed."
        confirmLabel="Delete note"
        isDanger
        busy={deleting}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};
