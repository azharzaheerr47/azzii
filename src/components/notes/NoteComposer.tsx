import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Send, Smile, X } from 'lucide-react';
import type { NoteImage, NoteTone, SharedNote, StickerId } from '../../types/index';
import { api } from '../../utils/apiClient';
import { StickerArtwork, StickerPicker, getStickerLabel } from '../artwork/StickerCollection';
import { useToast } from '../ui/ToastProvider';

interface NoteComposerProps {
  onCreated: (note: SharedNote) => void;
  initialSticker?: StickerId | null;
  onConsumeInitialSticker?: () => void;
}

interface PendingPreview {
  localId: string;
  file: File;
  previewUrl: string;
  uploaded?: NoteImage;
  uploading: boolean;
  error?: string;
}

const TONE_OPTIONS: { id: NoteTone; label: string; bgVar: string; borderVar: string }[] = [
  { id: 'white', label: 'Paper White', bgVar: 'var(--note-white-bg)', borderVar: 'var(--border-strong)' },
  { id: 'lavender', label: 'Soft Lavender', bgVar: 'var(--note-lavender-bg)', borderVar: 'var(--note-lavender-border)' },
  { id: 'pink', label: 'Light Pink', bgVar: 'var(--note-pink-bg)', borderVar: 'var(--note-pink-border)' },
  { id: 'blue', label: 'Soft Blue', bgVar: 'var(--note-blue-bg)', borderVar: 'var(--note-blue-border)' },
];

const SURFACE_STYLE: Record<NoteTone, { backgroundColor: string }> = {
  white: { backgroundColor: 'var(--note-white-bg)' },
  lavender: { backgroundColor: 'var(--note-lavender-bg)' },
  pink: { backgroundColor: 'var(--note-pink-bg)' },
  blue: { backgroundColor: 'var(--note-blue-bg)' },
};

export const NoteComposer: React.FC<NoteComposerProps> = ({
  onCreated,
  initialSticker = null,
  onConsumeInitialSticker,
}) => {
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<NoteTone>('white');
  const [sticker, setSticker] = useState<StickerId | null>(initialSticker);
  const [showStickers, setShowStickers] = useState(false);
  const [previews, setPreviews] = useState<PendingPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialSticker) {
      setSticker(initialSticker);
      onConsumeInitialSticker?.();
    }
  }, [initialSticker, onConsumeInitialSticker]);

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;

    const remainingSlots = 4 - previews.length;
    if (remainingSlots <= 0) {
      showToast('You can attach up to 4 images per note.', 'error');
      return;
    }

    const batch = selected.slice(0, remainingSlots);
    const invalid = batch.find(
      (f) => !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type),
    );
    if (invalid) {
      showToast('Only JPEG, PNG, and WebP images are supported.', 'error');
      return;
    }
    const oversized = batch.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) {
      showToast('Each image must be 5 MB or smaller.', 'error');
      return;
    }

    const newItems: PendingPreview[] = batch.map((file) => ({
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }));

    setPreviews((prev) => [...prev, ...newItems]);
    setUploadProgress(5);
    setErrorMsg(null);

    try {
      const uploaded = await api.uploadImages(batch, (pct) => setUploadProgress(pct));
      setPreviews((prev) =>
        prev.map((item) => {
          const idx = newItems.findIndex((n) => n.localId === item.localId);
          if (idx === -1) return item;
          return {
            ...item,
            uploading: false,
            uploaded: uploaded[idx],
          };
        }),
      );
      setUploadProgress(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image upload failed.';
      setUploadProgress(null);
      setErrorMsg(msg);
      showToast(msg, 'error');
      setPreviews((prev) =>
        prev.filter((item) => !newItems.some((n) => n.localId === item.localId)),
      );
      newItems.forEach((n) => URL.revokeObjectURL(n.previewUrl));
    }
  };

  const handleRemovePreview = async (localId: string) => {
    const target = previews.find((p) => p.localId === localId);
    if (!target) return;
    URL.revokeObjectURL(target.previewUrl);
    setPreviews((prev) => prev.filter((p) => p.localId !== localId));
    if (target.uploaded) {
      await api.deletePendingUpload(target.uploaded.cloudinaryPublicId).catch(() => undefined);
    }
  };

  const isUploadingAny = previews.some((p) => p.uploading);
  const canSubmit =
    !submitting &&
    !isUploadingAny &&
    (content.trim().length > 0 || previews.some((p) => p.uploaded) || sticker !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setErrorMsg('Write a note, attach a photo, or select a sticker before posting.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const images = previews.flatMap((p) => (p.uploaded ? [p.uploaded] : []));
      const { note } = await api.createNote({
        content: content.trim(),
        tone,
        sticker,
        images,
      });

      previews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setContent('');
      setTone('white');
      setSticker(null);
      setShowStickers(false);
      setPreviews([]);
      onCreated(note);
      showToast('Note shared in your space.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save note.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={SURFACE_STYLE[tone]}
      className="relative z-20 border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-5 shadow-xs backdrop-blur-md transition-colors duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <label htmlFor="note-composer-input" className="sr-only">
            Write a shared note
          </label>
          <textarea
            id="note-composer-input"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Leave a little note, thought, or memory..."
            rows={3}
            maxLength={4000}
            className="w-full bg-transparent resize-y min-h-[76px] text-[15px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>

        {sticker && (
          <div className="relative shrink-0 group">
            <StickerArtwork sticker={sticker} className="w-14 h-14" />
            <button
              type="button"
              onClick={() => setSticker(null)}
              aria-label={`Remove ${getStickerLabel(sticker)} sticker`}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--bg-card-elevated)] border border-[var(--border-strong)] shadow-xs flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--accent-soft-strong)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {previews.map((item) => (
            <div
              key={item.localId}
              className="relative aspect-4/3 rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]"
            >
              <img
                src={item.uploaded?.secureUrl || item.previewUrl}
                alt="Pending attachment preview"
                className={`w-full h-full object-cover ${item.uploading ? 'opacity-60' : ''}`}
              />
              {item.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="text-xs font-medium text-white tabular-nums">
                    {uploadProgress ?? 50}%
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemovePreview(item.localId)}
                aria-label="Remove attached image"
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-[#29253A]/75 text-white flex items-center justify-center hover:bg-[#29253A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadProgress !== null && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-[var(--accent-soft)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="mt-2.5 text-xs text-[var(--danger-text)]" role="alert">
          {errorMsg}
        </p>
      )}

      {/* Composer Toolbar */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleSelectFiles}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={previews.length >= 4 || isUploadingAny}
            aria-label="Add images"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-45 whitespace-nowrap shrink-0"
          >
            <ImagePlus className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Photos</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStickers((v) => !v)}
            aria-label="Choose a sticker"
            aria-expanded={showStickers}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showStickers
                ? 'bg-[var(--accent-soft-strong)] text-[var(--text-primary)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Smile className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Sticker</span>
          </button>

          {showStickers && (
            <div className="absolute left-0 top-12 z-30">
              <StickerPicker
                selected={sticker}
                onSelect={setSticker}
                onClose={() => setShowStickers(false)}
              />
            </div>
          )}

          <div
            className="flex items-center gap-1.5 pl-2 border-l border-[var(--border-subtle)]"
            role="radiogroup"
            aria-label="Note card color"
          >
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={tone === opt.id}
                aria-label={`${opt.label} note tone`}
                onClick={() => setTone(opt.id)}
                style={{ backgroundColor: opt.bgVar, borderColor: opt.borderVar }}
                className={`w-6 h-6 rounded-full border transition-transform ${
                  tone === opt.id
                    ? 'ring-2 ring-[var(--ring-focus)] ring-offset-1 scale-110'
                    : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-sm font-medium transition-colors disabled:bg-[var(--accent-soft)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{submitting ? 'Posting...' : 'Post Note'}</span>
        </button>
      </div>
    </form>
  );
};
