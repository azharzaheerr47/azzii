import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNoteTimestamp } from './dateFormat';
import { canUserMutateNote, filterAndSortNotes, upsertNoteIdempotent } from './noteFilters';
import { createNoteSchema, setupAccountSchema } from './validation';
import type { SharedNote } from '../types/index';

const makeNote = (overrides: Partial<SharedNote> = {}): SharedNote => ({
  id: 'note-1',
  authorId: 'user-1',
  authorName: 'Maya',
  authorAvatar: '',
  authorAvatarPreset: 'bow-cat',
  content: 'Picked up matcha croissants for tomorrow morning.',
  tone: 'lavender',
  images: [],
  sticker: 'happy-cat',
  createdAt: '2026-11-21T18:30:00.000Z',
  updatedAt: null,
  deletedAt: null,
  isDeleted: false,
  ...overrides,
});

test('formatNoteTimestamp formats Today, Yesterday, and full dates in UTC consistently', () => {
  const now = new Date('2026-11-21T20:00:00.000Z');

  assert.equal(formatNoteTimestamp('2026-11-21T11:15:00.000Z', now, 'UTC'), 'Today · 11:15 AM');
  assert.equal(formatNoteTimestamp('2026-11-20T20:30:00.000Z', now, 'UTC'), 'Yesterday · 8:30 PM');
  assert.equal(
    formatNoteTimestamp('2026-11-15T22:45:00.000Z', now, 'UTC'),
    '15 November 2026 · 10:45 PM',
  );
});

test('filterAndSortNotes filters by search, author, date, and excludes deleted notes from search', () => {
  const notes: SharedNote[] = [
    makeNote({ id: 'n1', authorId: 'u1', content: 'Morning coffee walk', createdAt: '2026-11-21T09:00:00.000Z' }),
    makeNote({ id: 'n2', authorId: 'u2', authorName: 'Leo', content: 'Movie tickets booked', createdAt: '2026-11-20T21:00:00.000Z' }),
    makeNote({
      id: 'n3',
      authorId: 'u1',
      content: 'Hidden deleted text',
      isDeleted: true,
      deletedAt: '2026-11-21T10:00:00.000Z',
      createdAt: '2026-11-21T08:00:00.000Z',
    }),
  ];

  // Search excludes deleted notes
  const searched = filterAndSortNotes(
    notes,
    { search: 'Hidden', authorId: 'all', dateFilter: '', sort: 'newest' },
    'UTC',
  );
  assert.equal(searched.length, 0);

  // Author filter
  const byLeo = filterAndSortNotes(
    notes,
    { search: '', authorId: 'u2', dateFilter: '', sort: 'newest' },
    'UTC',
  );
  assert.equal(byLeo.length, 1);
  assert.equal(byLeo[0].id, 'n2');

  // Sort oldest first
  const oldest = filterAndSortNotes(
    notes,
    { search: '', authorId: 'all', dateFilter: '', sort: 'oldest' },
    'UTC',
  );
  assert.deepEqual(
    oldest.map((n) => n.id),
    ['n2', 'n3', 'n1'],
  );
});

test('upsertNoteIdempotent prevents duplicate entries on repeated real-time events', () => {
  const initial = [makeNote({ id: 'n1', content: 'Initial' })];
  const updated = makeNote({ id: 'n1', content: 'Updated content', updatedAt: '2026-11-21T19:00:00.000Z' });
  const afterUpdate = upsertNoteIdempotent(initial, updated);
  assert.equal(afterUpdate.length, 1);
  assert.equal(afterUpdate[0].content, 'Updated content');

  const added = makeNote({ id: 'n2', content: 'Second note' });
  const afterAdd = upsertNoteIdempotent(afterUpdate, added);
  assert.equal(afterAdd.length, 2);
});

test('canUserMutateNote enforces author ownership and blocks deleted notes', () => {
  const activeOwn = makeNote({ authorId: 'u1', isDeleted: false });
  const activePartner = makeNote({ authorId: 'u2', isDeleted: false });
  const deletedOwn = makeNote({ authorId: 'u1', isDeleted: true });

  assert.equal(canUserMutateNote(activeOwn, 'u1'), true);
  assert.equal(canUserMutateNote(activePartner, 'u1'), false);
  assert.equal(canUserMutateNote(deletedOwn, 'u1'), false);
});

test('Zod schemas reject empty notes and weak passwords', () => {
  const emptyNote = createNoteSchema.safeParse({ content: '   ', tone: 'white', sticker: null, images: [] });
  assert.equal(emptyNote.success, false);

  const stickerOnly = createNoteSchema.safeParse({ content: '', tone: 'pink', sticker: 'love-cats', images: [] });
  assert.equal(stickerOnly.success, true);

  const shortPass = setupAccountSchema.safeParse({
    name: 'Maya',
    email: 'maya@example.com',
    password: '123',
    avatarPreset: 'bow-cat',
  });
  assert.equal(shortPass.success, false);
});
