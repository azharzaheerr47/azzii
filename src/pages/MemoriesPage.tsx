import React, { useMemo, useState } from 'react';
import { formatNoteTimestamp } from '../lib/dateFormat';
import type { PublicUser, SharedNote } from '../types/index';
import { CatDuoIllustration } from '../components/artwork/CatDuoIllustration';

interface MemoriesPageProps {
  members: PublicUser[];
  notes: SharedNote[];
  onOpenImage: (note: SharedNote, imageIndex: number) => void;
}

export const MemoriesPage: React.FC<MemoriesPageProps> = ({
  members,
  notes,
  onOpenImage,
}) => {
  const [authorFilter, setAuthorFilter] = useState<string>('all');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#29253A]">
            Memories Gallery
          </h1>
          <p className="mt-1 text-sm text-[#645E7B] tabular-nums">
            {photos.length} shared {photos.length === 1 ? 'photograph' : 'photographs'} saved
            together
          </p>
        </div>

        {/* Interactive filter tabs */}
        <div
          className="inline-flex items-center gap-1 p-1 bg-white border border-[#6554A4]/14 rounded-xl self-start sm:self-auto"
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
                : 'text-[#645E7B] hover:text-[#29253A]'
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
                  : 'text-[#645E7B] hover:text-[#29253A]'
              }`}
            >
              By {m.name}
            </button>
          ))}
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white border border-[#6554A4]/14 rounded-2xl p-10 text-center flex flex-col items-center">
          <CatDuoIllustration size="md" className="mb-4" />
          <h2 className="font-display text-base font-semibold text-[#29253A]">
            No memories uploaded yet
          </h2>
          <p className="mt-1 text-sm text-[#645E7B] max-w-sm">
            Attach JPEG, PNG, or WebP photos to any shared note and they will gather here
            automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {photos.map((entry) => {
            const timeLabel = formatNoteTimestamp(entry.note.createdAt);
            return (
              <button
                key={entry.image.id}
                type="button"
                onClick={() => onOpenImage(entry.note, entry.indexInNote)}
                aria-label={`Open photo shared by ${entry.note.authorName} on ${timeLabel}`}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-white border border-[#6554A4]/14 text-left focus-visible:ring-2 focus-visible:ring-[#6554A4]"
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
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#29253A]/80 via-[#29253A]/35 to-transparent p-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150">
                  <p className="text-xs font-semibold text-white truncate">
                    {entry.note.authorName}
                  </p>
                  <p className="text-[11px] text-white/85 tabular-nums truncate">{timeLabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
