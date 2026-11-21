import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AvatarPreset,
  NoteImage,
  NoteTone,
  PublicUser,
  SharedNote,
  SpaceSettings,
  SpaceStatus,
  StickerId,
} from '../../types/index';
import {
  connectMongoDB,
  NoteModel,
  SpaceModel,
  UserModel,
  type INoteDoc,
  type IUserDoc,
} from '../models/mongooseModels';
import { generateInviteCode, hashInviteCode, hashPassword, verifyPassword } from '../auth/crypto';
import { deleteStoredImage, isCloudinaryConfigured } from '../media/imageService';

interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string;
  avatarPreset: AvatarPreset;
  role: 'founder' | 'partner';
  createdAt: string;
}

interface StoredNoteRecord {
  id: string;
  authorId: string;
  content: string;
  tone: NoteTone;
  images: NoteImage[];
  sticker: StickerId | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  isDeleted: boolean;
}

interface StoredSpaceRecord {
  spaceName: string;
  tagline: string;
  welcomeMessage: string;
  logoStyle: 'cat-duo' | 'heart' | 'moon';
  inviteCodeHash: string | null;
  inviteExpiresAt: string | null;
  updatedAt: string;
}

interface LocalDatabaseSnapshot {
  users: StoredUserRecord[];
  notes: StoredNoteRecord[];
  space: StoredSpaceRecord;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const LOCAL_DB_PATH = path.resolve(DATA_DIR, 'space-db.json');
const DEFAULT_SPACE_ID = 'primary-space';

function defaultSpace(): StoredSpaceRecord {
  return {
    spaceName: 'Our Little Space',
    tagline: 'A quiet private corner for two',
    welcomeMessage: 'Leave little notes, favorite moments, and snapshots for each other here.',
    logoStyle: 'cat-duo',
    inviteCodeHash: null,
    inviteExpiresAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function readLocalDb(): LocalDatabaseSnapshot {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initial: LocalDatabaseSnapshot = {
      users: [],
      notes: [],
      space: defaultSpace(),
    };
    writeLocalDb(initial);
    return initial;
  }
  const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
  return JSON.parse(raw) as LocalDatabaseSnapshot;
}

function writeLocalDb(snapshot: LocalDatabaseSnapshot): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempPath = `${LOCAL_DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
  fs.renameSync(tempPath, LOCAL_DB_PATH);
}

function toPublicUser(u: StoredUserRecord): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    avatarPreset: u.avatarPreset,
    role: u.role,
    createdAt: u.createdAt,
  };
}

function mongoUserToRecord(doc: IUserDoc): StoredUserRecord {
  return {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    avatar: doc.avatar,
    avatarPreset: doc.avatarPreset,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
  };
}

function mongoNoteToRecord(doc: INoteDoc): StoredNoteRecord {
  return {
    id: doc._id,
    authorId: doc.authorId,
    content: doc.content,
    tone: doc.tone,
    images: doc.images.map((img) => ({
      id: img.id,
      cloudinaryPublicId: img.cloudinaryPublicId,
      secureUrl: img.secureUrl,
      width: img.width,
      height: img.height,
      format: img.format,
      uploadedAt: img.uploadedAt.toISOString(),
    })),
    sticker: doc.sticker,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
    isDeleted: doc.isDeleted,
  };
}

function hydrateNote(note: StoredNoteRecord, usersMap: Map<string, StoredUserRecord>): SharedNote {
  const author = usersMap.get(note.authorId);
  return {
    id: note.id,
    authorId: note.authorId,
    authorName: author?.name ?? 'Partner',
    authorAvatar: author?.avatar ?? '',
    authorAvatarPreset: author?.avatarPreset ?? 'bat-cat',
    content: note.isDeleted ? '' : note.content,
    tone: note.tone,
    images: note.isDeleted ? [] : note.images,
    sticker: note.isDeleted ? null : note.sticker,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: note.deletedAt,
    isDeleted: note.isDeleted,
  };
}

async function useMongo(): Promise<boolean> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return false;
  await connectMongoDB(uri);
  return true;
}

export async function getSpaceStatus(): Promise<SpaceStatus> {
  const mongo = await useMongo();
  if (mongo) {
    const userCount = await UserModel.countDocuments();
    const space = await SpaceModel.findById(DEFAULT_SPACE_ID).lean();
    const hasOpenInvite = Boolean(
      userCount < 2 &&
        space?.inviteCodeHash &&
        space.inviteExpiresAt &&
        new Date(space.inviteExpiresAt).getTime() > Date.now(),
    );
    return {
      initialized: userCount > 0,
      userCount,
      maxUsers: 2,
      hasOpenInvite,
      storageMode: 'mongodb',
      mediaMode: isCloudinaryConfigured() ? 'cloudinary' : 'local',
    };
  }

  const db = readLocalDb();
  const hasOpenInvite = Boolean(
    db.users.length < 2 &&
      db.space.inviteCodeHash &&
      db.space.inviteExpiresAt &&
      new Date(db.space.inviteExpiresAt).getTime() > Date.now(),
  );
  return {
    initialized: db.users.length > 0,
    userCount: db.users.length,
    maxUsers: 2,
    hasOpenInvite,
    storageMode: 'local',
    mediaMode: isCloudinaryConfigured() ? 'cloudinary' : 'local',
  };
}

export async function createFounderAccount(input: {
  name: string;
  email: string;
  password: string;
  avatarPreset: AvatarPreset;
}): Promise<{ user: PublicUser; inviteCode: string }> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = hashPassword(input.password);
  const inviteCode = generateInviteCode();
  const inviteHash = hashInviteCode(inviteCode);
  const inviteExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
  const userId = crypto.randomUUID();
  const now = new Date();

  const mongo = await useMongo();
  if (mongo) {
    const count = await UserModel.countDocuments();
    if (count > 0) {
      throw new Error('SPACE_ALREADY_INITIALIZED');
    }
    const created = await UserModel.create({
      _id: userId,
      name: input.name.trim(),
      email,
      passwordHash,
      avatar: '',
      avatarPreset: input.avatarPreset,
      role: 'founder',
      createdAt: now,
    });
    await SpaceModel.findByIdAndUpdate(
      DEFAULT_SPACE_ID,
      {
        $setOnInsert: {
          _id: DEFAULT_SPACE_ID,
          spaceName: 'Our Little Space',
          tagline: 'A quiet private corner for two',
          welcomeMessage: 'Leave little notes, favorite moments, and snapshots for each other here.',
          logoStyle: 'cat-duo',
        },
        $set: {
          inviteCodeHash: inviteHash,
          inviteExpiresAt: inviteExpires,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    return { user: toPublicUser(mongoUserToRecord(created)), inviteCode };
  }

  const db = readLocalDb();
  if (db.users.length > 0) {
    throw new Error('SPACE_ALREADY_INITIALIZED');
  }
  const newUser: StoredUserRecord = {
    id: userId,
    name: input.name.trim(),
    email,
    passwordHash,
    avatar: '',
    avatarPreset: input.avatarPreset,
    role: 'founder',
    createdAt: now.toISOString(),
  };
  db.users.push(newUser);
  db.space.inviteCodeHash = inviteHash;
  db.space.inviteExpiresAt = inviteExpires.toISOString();
  db.space.updatedAt = now.toISOString();
  writeLocalDb(db);
  return { user: toPublicUser(newUser), inviteCode };
}

export async function redeemPartnerInvite(input: {
  inviteCode: string;
  name: string;
  email: string;
  password: string;
  avatarPreset: AvatarPreset;
}): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const providedHash = hashInviteCode(input.inviteCode);
  const passwordHash = hashPassword(input.password);
  const userId = crypto.randomUUID();
  const now = new Date();

  const mongo = await useMongo();
  if (mongo) {
    const count = await UserModel.countDocuments();
    if (count >= 2) {
      throw new Error('SPACE_FULL');
    }
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }
    const space = await SpaceModel.findById(DEFAULT_SPACE_ID);
    if (
      !space ||
      !space.inviteCodeHash ||
      !space.inviteExpiresAt ||
      space.inviteExpiresAt.getTime() < Date.now() ||
      !crypto.timingSafeEqual(Buffer.from(space.inviteCodeHash), Buffer.from(providedHash))
    ) {
      throw new Error('INVALID_INVITE');
    }
    const created = await UserModel.create({
      _id: userId,
      name: input.name.trim(),
      email,
      passwordHash,
      avatar: '',
      avatarPreset: input.avatarPreset,
      role: 'partner',
      createdAt: now,
    });
    space.inviteCodeHash = null;
    space.inviteExpiresAt = null;
    space.updatedAt = now;
    await space.save();
    return toPublicUser(mongoUserToRecord(created));
  }

  const db = readLocalDb();
  if (db.users.length >= 2) {
    throw new Error('SPACE_FULL');
  }
  if (db.users.some((u) => u.email === email)) {
    throw new Error('EMAIL_EXISTS');
  }
  if (
    !db.space.inviteCodeHash ||
    !db.space.inviteExpiresAt ||
    new Date(db.space.inviteExpiresAt).getTime() < Date.now() ||
    !crypto.timingSafeEqual(Buffer.from(db.space.inviteCodeHash), Buffer.from(providedHash))
  ) {
    throw new Error('INVALID_INVITE');
  }
  const newUser: StoredUserRecord = {
    id: userId,
    name: input.name.trim(),
    email,
    passwordHash,
    avatar: '',
    avatarPreset: input.avatarPreset,
    role: 'partner',
    createdAt: now.toISOString(),
  };
  db.users.push(newUser);
  db.space.inviteCodeHash = null;
  db.space.inviteExpiresAt = null;
  db.space.updatedAt = now.toISOString();
  writeLocalDb(db);
  return toPublicUser(newUser);
}

export async function rotatePartnerInvite(requesterId: string): Promise<string> {
  const inviteCode = generateInviteCode();
  const inviteHash = hashInviteCode(inviteCode);
  const inviteExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const mongo = await useMongo();
  if (mongo) {
    const user = await UserModel.findById(requesterId);
    if (!user) throw new Error('UNAUTHORIZED');
    const count = await UserModel.countDocuments();
    if (count >= 2) throw new Error('SPACE_FULL');
    await SpaceModel.findByIdAndUpdate(
      DEFAULT_SPACE_ID,
      {
        $set: {
          inviteCodeHash: inviteHash,
          inviteExpiresAt: inviteExpires,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return inviteCode;
  }

  const db = readLocalDb();
  if (!db.users.some((u) => u.id === requesterId)) throw new Error('UNAUTHORIZED');
  if (db.users.length >= 2) throw new Error('SPACE_FULL');
  db.space.inviteCodeHash = inviteHash;
  db.space.inviteExpiresAt = inviteExpires.toISOString();
  db.space.updatedAt = new Date().toISOString();
  writeLocalDb(db);
  return inviteCode;
}

export async function authenticateUser(email: string, password: string): Promise<PublicUser | null> {
  const normalized = email.trim().toLowerCase();
  const mongo = await useMongo();
  if (mongo) {
    const user = await UserModel.findOne({ email: normalized });
    if (!user) return null;
    if (!verifyPassword(password, user.passwordHash)) return null;
    return toPublicUser(mongoUserToRecord(user));
  }

  const db = readLocalDb();
  const user = db.users.find((u) => u.email === normalized);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  const mongo = await useMongo();
  if (mongo) {
    const user = await UserModel.findById(userId);
    return user ? toPublicUser(mongoUserToRecord(user)) : null;
  }
  const db = readLocalDb();
  const user = db.users.find((u) => u.id === userId);
  return user ? toPublicUser(user) : null;
}

export async function listSpaceMembers(): Promise<PublicUser[]> {
  const mongo = await useMongo();
  if (mongo) {
    const users = await UserModel.find().sort({ createdAt: 1 });
    return users.map((u) => toPublicUser(mongoUserToRecord(u)));
  }
  const db = readLocalDb();
  return db.users.map(toPublicUser);
}

export async function updateUserProfile(
  userId: string,
  input: { name: string; avatarPreset: AvatarPreset; avatar?: string },
): Promise<PublicUser> {
  const mongo = await useMongo();
  if (mongo) {
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          name: input.name.trim(),
          avatarPreset: input.avatarPreset,
          ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
        },
      },
      { new: true },
    );
    if (!updated) throw new Error('NOT_FOUND');
    return toPublicUser(mongoUserToRecord(updated));
  }

  const db = readLocalDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('NOT_FOUND');
  db.users[idx] = {
    ...db.users[idx],
    name: input.name.trim(),
    avatarPreset: input.avatarPreset,
    ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
  };
  writeLocalDb(db);
  return toPublicUser(db.users[idx]);
}

export async function getSpaceSettings(): Promise<SpaceSettings> {
  const mongo = await useMongo();
  if (mongo) {
    let space = await SpaceModel.findById(DEFAULT_SPACE_ID);
    if (!space) {
      space = await SpaceModel.create({ _id: DEFAULT_SPACE_ID });
    }
    return {
      spaceName: space.spaceName,
      tagline: space.tagline,
      welcomeMessage: space.welcomeMessage,
      logoStyle: space.logoStyle,
      updatedAt: space.updatedAt.toISOString(),
    };
  }
  const db = readLocalDb();
  return {
    spaceName: db.space.spaceName,
    tagline: db.space.tagline,
    welcomeMessage: db.space.welcomeMessage,
    logoStyle: db.space.logoStyle,
    updatedAt: db.space.updatedAt,
  };
}

export async function updateSpaceSettings(input: {
  spaceName: string;
  tagline: string;
  welcomeMessage: string;
  logoStyle: 'cat-duo' | 'heart' | 'moon';
}): Promise<SpaceSettings> {
  const now = new Date();
  const mongo = await useMongo();
  if (mongo) {
    const space = await SpaceModel.findByIdAndUpdate(
      DEFAULT_SPACE_ID,
      {
        $set: {
          spaceName: input.spaceName.trim(),
          tagline: input.tagline.trim(),
          welcomeMessage: input.welcomeMessage.trim(),
          logoStyle: input.logoStyle,
          updatedAt: now,
        },
      },
      { new: true, upsert: true },
    );
    return {
      spaceName: space.spaceName,
      tagline: space.tagline,
      welcomeMessage: space.welcomeMessage,
      logoStyle: space.logoStyle,
      updatedAt: space.updatedAt.toISOString(),
    };
  }

  const db = readLocalDb();
  db.space = {
    ...db.space,
    spaceName: input.spaceName.trim(),
    tagline: input.tagline.trim(),
    welcomeMessage: input.welcomeMessage.trim(),
    logoStyle: input.logoStyle,
    updatedAt: now.toISOString(),
  };
  writeLocalDb(db);
  return {
    spaceName: db.space.spaceName,
    tagline: db.space.tagline,
    welcomeMessage: db.space.welcomeMessage,
    logoStyle: db.space.logoStyle,
    updatedAt: db.space.updatedAt,
  };
}

export async function listNotes(options?: {
  search?: string;
  authorId?: string;
  sort?: 'newest' | 'oldest';
}): Promise<SharedNote[]> {
  const mongo = await useMongo();
  let usersMap: Map<string, StoredUserRecord>;
  let noteRecords: StoredNoteRecord[];

  if (mongo) {
    const [users, notes] = await Promise.all([
      UserModel.find(),
      NoteModel.find().sort({ createdAt: options?.sort === 'oldest' ? 1 : -1 }),
    ]);
    usersMap = new Map(users.map((u) => [u._id, mongoUserToRecord(u)]));
    noteRecords = notes.map(mongoNoteToRecord);
  } else {
    const db = readLocalDb();
    usersMap = new Map(db.users.map((u) => [u.id, u]));
    noteRecords = [...db.notes].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return options?.sort === 'oldest' ? ta - tb : tb - ta;
    });
  }

  let hydrated = noteRecords.map((n) => hydrateNote(n, usersMap));
  if (options?.authorId && options.authorId !== 'all') {
    hydrated = hydrated.filter((n) => n.authorId === options.authorId);
  }
  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    hydrated = hydrated.filter(
      (n) =>
        !n.isDeleted &&
        (n.content.toLowerCase().includes(q) ||
          n.authorName.toLowerCase().includes(q) ||
          (n.sticker ?? '').toLowerCase().includes(q)),
    );
  }
  return hydrated;
}

export async function createNote(
  authorId: string,
  input: {
    content: string;
    tone: NoteTone;
    sticker: StickerId | null;
    images: NoteImage[];
  },
): Promise<SharedNote> {
  const noteId = crypto.randomUUID();
  const now = new Date();

  const mongo = await useMongo();
  if (mongo) {
    const author = await UserModel.findById(authorId);
    if (!author) throw new Error('UNAUTHORIZED');
    const created = await NoteModel.create({
      _id: noteId,
      authorId,
      content: input.content.trim(),
      tone: input.tone,
      images: input.images.map((img) => ({
        ...img,
        uploadedAt: new Date(img.uploadedAt),
      })),
      sticker: input.sticker,
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
      isDeleted: false,
    });
    const usersMap = new Map([[author._id, mongoUserToRecord(author)]]);
    return hydrateNote(mongoNoteToRecord(created), usersMap);
  }

  const db = readLocalDb();
  const author = db.users.find((u) => u.id === authorId);
  if (!author) throw new Error('UNAUTHORIZED');
  const record: StoredNoteRecord = {
    id: noteId,
    authorId,
    content: input.content.trim(),
    tone: input.tone,
    images: input.images,
    sticker: input.sticker,
    createdAt: now.toISOString(),
    updatedAt: null,
    deletedAt: null,
    isDeleted: false,
  };
  db.notes.unshift(record);
  writeLocalDb(db);
  return hydrateNote(record, new Map([[author.id, author]]));
}

export async function updateNoteByAuthor(
  noteId: string,
  requesterId: string,
  input: {
    content: string;
    tone?: NoteTone;
    sticker?: StickerId | null;
    images?: NoteImage[];
  },
): Promise<SharedNote> {
  const now = new Date();
  const mongo = await useMongo();

  if (mongo) {
    const existing = await NoteModel.findById(noteId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.authorId !== requesterId) throw new Error('FORBIDDEN');
    if (existing.isDeleted) throw new Error('ALREADY_DELETED');

    const previousPublicIds = existing.images.map((i) => i.cloudinaryPublicId);
    const nextImages = input.images ?? existing.images;
    const nextPublicIds = new Set(nextImages.map((i) => i.cloudinaryPublicId));
    for (const oldId of previousPublicIds) {
      if (!nextPublicIds.has(oldId)) {
        await deleteStoredImage(oldId);
      }
    }

    existing.content = input.content.trim();
    if (input.tone !== undefined) existing.tone = input.tone;
    if (input.sticker !== undefined) existing.sticker = input.sticker;
    if (input.images !== undefined) {
      existing.images = input.images.map((img) => ({
        ...img,
        uploadedAt: new Date(img.uploadedAt),
      }));
    }
    existing.updatedAt = now;
    await existing.save();

    const author = await UserModel.findById(existing.authorId);
    const usersMap = author ? new Map([[author._id, mongoUserToRecord(author)]]) : new Map();
    return hydrateNote(mongoNoteToRecord(existing), usersMap);
  }

  const db = readLocalDb();
  const idx = db.notes.findIndex((n) => n.id === noteId);
  if (idx === -1) throw new Error('NOT_FOUND');
  const existing = db.notes[idx];
  if (existing.authorId !== requesterId) throw new Error('FORBIDDEN');
  if (existing.isDeleted) throw new Error('ALREADY_DELETED');

  if (input.images !== undefined) {
    const nextIds = new Set(input.images.map((i) => i.cloudinaryPublicId));
    for (const img of existing.images) {
      if (!nextIds.has(img.cloudinaryPublicId)) {
        await deleteStoredImage(img.cloudinaryPublicId);
      }
    }
  }

  const updated: StoredNoteRecord = {
    ...existing,
    content: input.content.trim(),
    tone: input.tone ?? existing.tone,
    sticker: input.sticker !== undefined ? input.sticker : existing.sticker,
    images: input.images !== undefined ? input.images : existing.images,
    updatedAt: now.toISOString(),
  };
  db.notes[idx] = updated;
  writeLocalDb(db);
  const usersMap = new Map(db.users.map((u) => [u.id, u]));
  return hydrateNote(updated, usersMap);
}

export async function softDeleteNoteByAuthor(
  noteId: string,
  requesterId: string,
): Promise<SharedNote> {
  const now = new Date();
  const mongo = await useMongo();

  if (mongo) {
    const existing = await NoteModel.findById(noteId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.authorId !== requesterId) throw new Error('FORBIDDEN');
    if (existing.isDeleted) throw new Error('ALREADY_DELETED');

    for (const img of existing.images) {
      await deleteStoredImage(img.cloudinaryPublicId);
    }

    existing.content = '';
    existing.images = [];
    existing.sticker = null;
    existing.isDeleted = true;
    existing.deletedAt = now;
    await existing.save();

    const author = await UserModel.findById(existing.authorId);
    const usersMap = author ? new Map([[author._id, mongoUserToRecord(author)]]) : new Map();
    return hydrateNote(mongoNoteToRecord(existing), usersMap);
  }

  const db = readLocalDb();
  const idx = db.notes.findIndex((n) => n.id === noteId);
  if (idx === -1) throw new Error('NOT_FOUND');
  const existing = db.notes[idx];
  if (existing.authorId !== requesterId) throw new Error('FORBIDDEN');
  if (existing.isDeleted) throw new Error('ALREADY_DELETED');

  for (const img of existing.images) {
    await deleteStoredImage(img.cloudinaryPublicId);
  }

  const updated: StoredNoteRecord = {
    ...existing,
    content: '',
    images: [],
    sticker: null,
    isDeleted: true,
    deletedAt: now.toISOString(),
  };
  db.notes[idx] = updated;
  writeLocalDb(db);
  const usersMap = new Map(db.users.map((u) => [u.id, u]));
  return hydrateNote(updated, usersMap);
}
