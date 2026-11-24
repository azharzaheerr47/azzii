import React, { useMemo, useState } from 'react';
import { LayoutGrid, List, Search, X } from 'lucide-react';
import { filterAndSortNotes } from '../lib/noteFilters';
import type {
  NoteFilterState,
  NotesLayoutMode,
  PublicUser,
  SharedNote,
  StickerId,
} from '../types/index';
import { CatDuoIllustration } from '../components/artwork/CatDuoIllustration';
import { NoteCard } from '../components/notes/NoteCard';
import { NoteComposer } from '../components/notes/NoteComposer';
import { NoteSkeletonList } from '../components/ui/SkeletonLoaders';

interface NotesPageProps {
  user: PublicUser;
  members: PublicUser[];
  notes: SharedNote[];
  loadingNotes: boolean;
  onlineUserIds: string[];
  initialSticker?: StickerId | null;
  onConsumeInitialSticker?: () => void;
  onNoteCreated: (note: SharedNote) => void;
  onNoteUpdated: (note: SharedNote) => void;
  onNoteDeleted: (note: SharedNote) => void;
  onOpenImage: (note: SharedNote, imageIndex: number) => void;
}

export const NotesPage: React.FC<NotesPageProps> = ({
  user,
  members,
  notes,
  loadingNotes,
  onlineUserIds,
  initialSticker = null,
  onConsumeInitialSticker,
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  onOpenImage,
}) => {
  const [layout, setLayout] = useState<NotesLayoutMode>('feed');
  const [filters, setFilters] = useState<NoteFilterState>({
    search: '',
    authorId: 'all',
    dateFilter: '',
    sort: 'newest',
  });

  const filteredNotes = useMemo(() => filterAndSortNotes(notes, filters), [notes, filters]);
  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.authorId !== 'all' ||
    Boolean(filters.dateFilter);

  const resetFilters = () =>
    setFilters({ search: '', authorId: 'all', dateFilter: '', sort: 'newest' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Shared Notes
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)] tabular-nums">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'entry' : 'entries'} in your
            shared timeline
          </p>
        </div>

        {/* Layout Toggle */}
        <div
          className="inline-flex items-center gap-1 p-1 bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-xl self-start sm:self-auto"
          role="group"
          aria-label="Notes layout toggle"
        >
          <button
            type="button"
            onClick={() => setLayout('feed')}
            aria-pressed={layout === 'feed'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              layout === 'feed'
                ? 'bg-[var(--accent-soft-strong)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>
          <button
            type="button"
            onClick={() => setLayout('grid')}
            aria-pressed={layout === 'grid'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              layout === 'grid'
                ? 'bg-[var(--accent-soft-strong)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      <NoteComposer
        onCreated={onNoteCreated}
        initialSticker={initialSticker}
        onConsumeInitialSticker={onConsumeInitialSticker}
      />

      {/* Search & Filter Bar */}
      <section
        aria-label="Search and filter notes"
        className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center gap-3"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="notes-search-input" className="sr-only">
            Search shared notes
          </label>
          <input
            id="notes-search-input"
            type="search"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search notes by keyword, sticker, or author..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label htmlFor="notes-author-filter" className="sr-only">
              Filter by creator
            </label>
            <select
              id="notes-author-filter"
              value={filters.authorId}
              onChange={(e) => setFilters((f) => ({ ...f, authorId: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
            >
              <option value="all">Both partners</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  Only {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes-date-filter" className="sr-only">
              Filter by date
            </label>
            <input
              id="notes-date-filter"
              type="date"
              value={filters.dateFilter}
              onChange={(e) => setFilters((f) => ({ ...f, dateFilter: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-xs font-medium text-[var(--text-primary)] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
            />
          </div>

          <div>
            <label htmlFor="notes-sort-order" className="sr-only">
              Sort order
            </label>
            <select
              id="notes-sort-order"
              value={filters.sort}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  sort: e.target.value === 'oldest' ? 'oldest' : 'newest',
                }))
              }
              className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]/30"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </section>

      {/* Notes Feed or Grid */}
      {loadingNotes ? (
        <NoteSkeletonList count={4} />
      ) : filteredNotes.length === 0 ? (
        <div className="bg-[var(--bg-card)] backdrop-blur-md border border-[var(--border-subtle)] rounded-2xl p-10 text-center flex flex-col items-center">
          <CatDuoIllustration size="md" className="mb-4" />
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
            {hasActiveFilters ? 'No matching notes found' : 'No notes yet'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)] max-w-sm">
            {hasActiveFilters
              ? 'Try adjusting your search keywords, date, or partner filter.'
              : 'Write your first shared note above to start filling your timeline.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-on-primary)] text-xs font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            layout === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start'
              : 'space-y-4'
          }
        >
          {filteredNotes.map((note) => (
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
    </div>
  );
};
