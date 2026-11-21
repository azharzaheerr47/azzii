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

const CARD_TONE_CLASSES: Record<NoteTone, string> = {
  white: 'bg-white border-[#6554A4]/14',
  lavender: 'bg-[#E9DFFF]/55 border-[#BFA7F2]/60',
  pink: 'bg-[#FFD6E7]/55 border-[#F4A8C7]/60',
  blue: 'bg-[#D8E9FF]/55 border-[#9EC5FA]/60',
};

const TONE_SWATCHES: { id: NoteTone; label: string; bg: string }[] = [
  { id: 'white', label: 'White', bg: 'bg-white' },
  { id: 'lavender', label: 'Lavender', bg: 'bg-[#E9DFFF]' },
  { id: 'pink', label: 'Pink', bg: 'bg-[#FFD6E7]' },
  { id: 'blue', label: 'Blue', bg: 'bg-[#D8E9FF]' },
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
        className="bg-[#FAF9FE] border border-dashed border-[#6554A4]/20 rounded-2xl px-4 py-3.5 text-sm text-[#645E7B]"
        aria-label={`Deleted note by ${note.authorName}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="italic text-[#645E7B]">This note was deleted by its author.</p>
          <span className="text-xs tabular-nums text-[#645E7B]/85">
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

  return (
    <>
      <motion.article
        layout="position"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className={`border rounded-2xl p-4 sm:p-5 transition-shadow duration-150 hover:shadow-sm ${CARD_TONE_CLASSES[note.tone]}`}
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
                <span className="font-semibold text-[#29253A] truncate">{note.authorName}</span>
                <span aria-hidden="true" className="text-[#645E7B]/60">
                  ·
                </span>
                <time
                  dateTime={note.createdAt}
                  className="text-xs text-[#645E7B] tabular-nums"
                >
                  {createdLabel}
                </time>
                {editedLabel && (
                  <>
                    <span aria-hidden="true" className="text-[#645E7B]/60">
                      ·
                    </span>
                    <span
                      className="text-xs font-medium text-[#6554A4]"
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
                className="p-2 rounded-xl text-[#645E7B] hover:text-[#29253A] hover:bg-black/5 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label={`Delete note by ${note.authorName} from ${createdLabel}`}
                className="p-2 rounded-xl text-[#645E7B] hover:text-[#B91C1C] hover:bg-[#B91C1C]/8 transition-colors"
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
              className="w-full bg-white/85 border border-[#6554A4]/25 rounded-xl p-3 text-[15px] leading-relaxed text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/30"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 relative">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditStickers((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/80 border border-[#6554A4]/15 text-xs font-medium text-[#29253A]"
                >
                  <Smile className="w-3.5 h-3.5 text-[#6554A4]" />
                  <span>{draftSticker ? getStickerLabel(draftSticker) : 'Sticker'}</span>
                </button>
                {draftSticker && (
                  <button
                    type="button"
                    onClick={() => setDraftSticker(null)}
                    aria-label="Remove sticker"
                    className="p-1 rounded-lg text-[#645E7B] hover:text-[#29253A]"
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
                <div className="flex items-center gap-1 pl-2 border-l border-[#6554A4]/15">
                  {TONE_SWATCHES.map((sw) => (
                    <button
                      key={sw.id}
                      type="button"
                      onClick={() => setDraftTone(sw.id)}
                      aria-label={`Set note tone to ${sw.label}`}
                      className={`w-5 h-5 rounded-full border border-[#6554A4]/25 ${sw.bg} ${
                        draftTone === sw.id ? 'ring-2 ring-[#6554A4]' : ''
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
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#645E7B] hover:bg-black/5 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6554A4] text-white text-xs font-medium hover:bg-[#534391] disabled:opacity-60 whitespace-nowrap"
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
                <p className="text-[15px] leading-relaxed text-[#29253A] whitespace-pre-wrap break-words">
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
                className={`group relative overflow-hidden rounded-xl border border-[#6554A4]/12 bg-[#FAF9FE] block text-left ${
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
