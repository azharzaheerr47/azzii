import React, { useMemo, useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import { formatNoteTimestamp } from '../lib/dateFormat';
import type { NoteImage, PublicUser, SharedNote } from '../types/index';
import { api } from '../utils/apiClient';
import { SunflowerAccent } from '../components/artwork/SunflowerIllustration';
import { useToast } from '../components/ui/ToastProvider';

interface MemoriesPageProps {
  members: PublicUser[];
  notes: SharedNote[];
  onNoteCreated: (note: SharedNote) => void;
  onOpenImage: (note: SharedNote, imageIndex: number) => void;
}

export const MemoriesPage: React.FC<MemoriesPageProps> = ({
  members,
  notes,
  onNoteCreated,
  onOpenImage,
}) => {
  const { showToast } = useToast();
  const [authorFilter, setAuthorFilter] = useState<string>('all');

  // Direct memory uploader
  const [showUploader, setShowUploader] = useState(false);
  const [caption, setCaption] = useState('');
  const [pendingImages, setPendingImages] = useState<NoteImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [savingMemory, setSavingMemory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const photos = useMemo(() => {
    return notes
      .filter((n) => !n.isDeleted && n.images.length > 0)
      .filter((n) => authorFilter === 'all' || n.authorId === authorFilter)
      .flatMap((n) =>
        n.images.map((img, idx) => ({
          note: n,
          image: img,
          indexInNote: idx,
        })),
      );
  }, [notes, authorFilter]);

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;

    const remaining = 4 - pendingImages.length;
    if (remaining <= 0) {
      showToast('You can upload up to 4 photos per memory.', 'error');
      return;
    }

    const batch = selected.slice(0, remaining);
    const invalid = batch.find(
      (f) => !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type),
    );
    if (invalid) {
      showToast('Only JPEG, PNG, and WebP images are supported.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      const uploaded = await api.uploadImages(batch, (pct) => setUploadProgress(pct));
      setPendingImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Photo upload failed.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemovePending = async (img: NoteImage) => {
    setPendingImages((prev) => prev.filter((item) => item.id !== img.id));
    await api.deletePendingUpload(img.cloudinaryPublicId).catch(() => undefined);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingImages.length === 0) return;
    setSavingMemory(true);
    try {
      const { note } = await api.createNote({
        content: caption.trim(),
        tone: 'white',
        sticker: null,
        images: pendingImages,
      });
      onNoteCreated(note);
      setCaption('');
      setPendingImages([]);
      setShowUploader(false);
      showToast('Memory added to your shared gallery.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save memory.', 'error');
    } finally {
      setSavingMemory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#29253A]">
            Memories Gallery
          </h1>
          <p className="mt-1 text-sm text-[#817B90] tabular-nums">
            {photos.length} shared {photos.length === 1 ? 'photograph' : 'photographs'} saved
            together
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Interactive filter tabs */}
          <div
            className="inline-flex items-center gap-1 p-1 bg-white border border-[#6554A4]/14 rounded-xl"
            role="group"
            aria-label="Filter memories by partner"
          >
            <button
              type="button"
              onClick={() => setAuthorFilter('all')}
              aria-pressed={authorFilter === 'all'}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                authorFilter === 'all'
                  ? 'bg-[#E9DFFF]/70 text-[#29253A]'
                  : 'text-[#817B90] hover:text-[#29253A]'
              }`}
            >
              All photos
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAuthorFilter(m.id)}
                aria-pressed={authorFilter === m.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  authorFilter === m.id
                    ? 'bg-[#E9DFFF]/70 text-[#29253A]'
                    : 'text-[#817B90] hover:text-[#29253A]'
                }`}
              >
                By {m.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowUploader((v) => !v)}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <ImagePlus className="w-4 h-4" />
            <span>{showUploader ? 'Close uploader' : 'Add memory'}</span>
          </button>
        </div>
      </div>

      {/* Direct Photo Memory Uploader */}
      {showUploader && (
        <form
          onSubmit={handleSaveMemory}
          className="bg-[#FFF9EA]/65 border border-[#F3BB38]/45 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#29253A]">
                Save a photo memory
              </h2>
              <p className="text-xs text-[#817B90]">
                Upload up to 4 JPEG, PNG, or WebP snapshots with an optional caption.
              </p>
            </div>
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
              disabled={uploading || pendingImages.length >= 4}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#6554A4]/20 text-xs font-medium text-[#29253A] hover:bg-[#FCFAFF] disabled:opacity-50 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-[#6554A4]" />
              <span>{uploading ? `Uploading ${uploadProgress ?? 0}%` : 'Choose photos'}</span>
            </button>
          </div>

          {pendingImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pendingImages.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-4/3 rounded-xl overflow-hidden bg-white border border-[#6554A4]/15"
                >
                  <img
                    src={img.secureUrl}
                    alt="Uploaded memory preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePending(img)}
                    aria-label="Remove uploaded photo"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-[#29253A]/75 text-white flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="memory-caption-input" className="sr-only">
              Memory caption
            </label>
            <input
              id="memory-caption-input"
              type="text"
              maxLength={400}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a short memory caption (optional)..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-[#6554A4]/18 bg-white text-sm text-[#29253A] focus:outline-none focus:ring-2 focus:ring-[#6554A4]/25"
            />
            <button
              type="submit"
              disabled={savingMemory || uploading || pendingImages.length === 0}
              className="px-4 py-2 rounded-xl bg-[#6554A4] hover:bg-[#534391] text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              {savingMemory ? 'Saving...' : 'Save to gallery'}
            </button>
          </div>
        </form>
      )}

      {photos.length === 0 ? (
        <div className="bg-white border border-[#6554A4]/14 rounded-2xl p-10 text-center flex flex-col items-center">
          <SunflowerAccent className="w-16 h-16 mb-3" />
          <h2 className="font-display text-base font-semibold text-[#29253A]">
            No memories uploaded yet
          </h2>
          <p className="mt-1 text-sm text-[#817B90] max-w-sm">
            Upload snapshots here or attach JPEG, PNG, or WebP photos to any shared note to gather
            your keepsakes together.
          </p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 gap-4 space-y-4">
          {photos.map((entry, idx) => {
            const timeLabel = formatNoteTimestamp(entry.note.createdAt);
            const fallbackAspect =
              idx % 3 === 0 ? 'aspect-[4/3]' : idx % 3 === 1 ? 'aspect-[4/5]' : 'aspect-square';
            return (
              <button
                key={entry.image.id}
                type="button"
                onClick={() => onOpenImage(entry.note, entry.indexInNote)}
                aria-label={`Open photo shared by ${entry.note.authorName} on ${timeLabel}`}
                className={`group relative w-full break-inside-avoid rounded-2xl overflow-hidden bg-white border border-[#6554A4]/14 text-left focus-visible:ring-2 focus-visible:ring-[#6554A4] block ${fallbackAspect}`}
              >
                <img
                  src={entry.image.secureUrl}
                  alt={
                    entry.note.content
                      ? `Memory: ${entry.note.content.slice(0, 60)}`
                      : `Photo by ${entry.note.authorName}`
                  }
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#29253A]/85 via-[#29253A]/35 to-transparent p-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150">
                  {entry.note.content && (
                    <p className="text-xs font-medium text-white line-clamp-1 mb-0.5">
                      {entry.note.content}
                    </p>
                  )}
                  <p className="text-[11px] text-white/85 tabular-nums truncate">
                    {entry.note.authorName} · {timeLabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
