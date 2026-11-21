import type { NoteFilterState, SharedNote } from '../types/index';
import { toLocalDateKey } from './dateFormat';

export function filterAndSortNotes(
  notes: SharedNote[],
  filters: NoteFilterState,
  timeZone?: string,
): SharedNote[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = notes.filter((note) => {
    if (filters.authorId && filters.authorId !== 'all' && note.authorId !== filters.authorId) {
      return false;
    }

    if (filters.dateFilter) {
      const noteDay = toLocalDateKey(note.createdAt, timeZone);
      if (noteDay !== filters.dateFilter) {
        return false;
      }
    }

    if (query) {
      if (note.isDeleted) {
        return false;
      }
      const inContent = note.content.toLowerCase().includes(query);
      const inAuthor = note.authorName.toLowerCase().includes(query);
      const inSticker = (note.sticker ?? '').toLowerCase().includes(query);
      if (!inContent && !inAuthor && !inSticker) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return filters.sort === 'oldest' ? timeA - timeB : timeB - timeA;
  });
}

export function upsertNoteIdempotent(notes: SharedNote[], incoming: SharedNote): SharedNote[] {
  const index = notes.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...notes];
  }
  const next = [...notes];
  next[index] = incoming;
  return next;
}

export function canUserMutateNote(note: SharedNote, userId: string): boolean {
  return !note.isDeleted && note.authorId === userId;
}
