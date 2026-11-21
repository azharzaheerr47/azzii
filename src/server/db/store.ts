import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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
  DatabaseConnectionError,
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
  spaceId: string;
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
  spaceId: string;
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
  id?: string;
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
  space?: StoredSpaceRecord;
  spaces?: Record<string, StoredSpaceRecord>;
}

const DATA_DIR =
  process.env.VERCEL === '1'
    ? path.resolve(os.tmpdir(), '.data')
    : path.resolve(process.cwd(), '.data');
const LOCAL_DB_PATH = path.resolve(DATA_DIR, 'space-db.json');
export const DEFAULT_SPACE_ID = 'primary-space';

function defaultSpace(spaceName = 'Our Little Space'): StoredSpaceRecord {
  return {
    spaceName,
    tagline: 'A quiet private corner for two',
    welcomeMessage: 'Leave little notes, favorite moments, and snapshots for each other here.',
    logoStyle: 'cat-duo',
    inviteCodeHash: null,
    inviteExpiresAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLocalSnapshot(raw: LocalDatabaseSnapshot): {
  users: StoredUserRecord[];
  notes: StoredNoteRecord[];
  spaces: Record<string, StoredSpaceRecord>;
} {
  const spaces: Record<string, StoredSpaceRecord> = { ...(raw.spaces || {}) };
  if (raw.space && !spaces[DEFAULT_SPACE_ID]) {
    spaces[DEFAULT_SPACE_ID] = raw.space;
  }
  if (!spaces[DEFAULT_SPACE_ID]) {
    spaces[DEFAULT_SPACE_ID] = defaultSpace();
  }
  const users = (raw.users || []).map((u) => ({
    ...u,
    spaceId: u.spaceId || DEFAULT_SPACE_ID,
  }));
  const notes = (raw.notes || []).map((n) => ({
    ...n,
    spaceId: n.spaceId || DEFAULT_SPACE_ID,
  }));
  return { users, notes, spaces };
}

function readLocalDb(): {
  users: StoredUserRecord[];
  notes: StoredNoteRecord[];
  spaces: Record<string, StoredSpaceRecord>;
} {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initial = {
      users: [],
      notes: [],
      spaces: { [DEFAULT_SPACE_ID]: defaultSpace() },
    };
    writeLocalDb(initial);
    return initial;
  }
  const raw = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8')) as LocalDatabaseSnapshot;
  return normalizeLocalSnapshot(raw);
}

function writeLocalDb(snapshot: {
  users: StoredUserRecord[];
  notes: StoredNoteRecord[];
  spaces: Record<string, StoredSpaceRecord>;
}): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempPath = `${LOCAL_DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf8');
  fs.renameSync(tempPath, LOCAL_DB_PATH);
}

function toPublicUser(u: StoredUserRecord): PublicUser {
  return {
    id: u.id,
    spaceId: u.spaceId || DEFAULT_SPACE_ID,
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
    spaceId: doc.spaceId || DEFAULT_SPACE_ID,
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
    spaceId: doc.spaceId || DEFAULT_SPACE_ID,
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

function mongoSpaceFilter(spaceId: string): Record<string, unknown> {
  if (spaceId === DEFAULT_SPACE_ID) {
    return { $or: [{ spaceId: DEFAULT_SPACE_ID }, { spaceId: { $exists: false } }] };
  }
  return { spaceId };
}

function isMongoDuplicateKeyError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: unknown }).code === 11000,
  );
}

async function useMongo(): Promise<boolean> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    if (process.env.VERCEL === '1') {
      throw new DatabaseConnectionError(
        'MONGODB_NOT_CONFIGURED',
        'MONGODB_URI is not set in Vercel Environment Variables.',
      );
    }
    return false;
  }
  await connectMongoDB(uri);
  return true;
}

export async function getSpaceStatus(spaceId?: string): Promise<SpaceStatus> {
  const mongo = await useMongo();
  if (mongo) {
    if (spaceId) {
      const [userCount, space] = await Promise.all([
        UserModel.countDocuments(mongoSpaceFilter(spaceId)),
        SpaceModel.findById(spaceId).lean(),
      ]);
      const hasOpenInvite = Boolean(
        userCount < 2 &&
          space?.inviteCodeHash &&
          space.inviteExpiresAt &&
          new Date(space.inviteExpiresAt).getTime() > Date.now(),
      );
      return {
        initialized: true,
        userCount,
        maxUsers: 2,
        hasOpenInvite,
        storageMode: 'mongodb',
        mediaMode: isCloudinaryConfigured() ? 'cloudinary' : 'local',
      };
    }

    const totalUsers = await UserModel.countDocuments();
    const defaultUserCount =
      totalUsers > 0 ? await UserModel.countDocuments(mongoSpaceFilter(DEFAULT_SPACE_ID)) : 0;
    const openSpaceInvite = await SpaceModel.findOne({
      inviteCodeHash: { $ne: null },
      inviteExpiresAt: { $gt: new Date() },
    })
      .select({ _id: 1 })
      .lean();

    return {
      initialized: totalUsers > 0,
      userCount: Math.min(defaultUserCount, 2),
      maxUsers: 2,
      hasOpenInvite: Boolean(openSpaceInvite),
      storageMode: 'mongodb',
      mediaMode: isCloudinaryConfigured() ? 'cloudinary' : 'local',
    };
  }

  const db = readLocalDb();
  if (spaceId) {
    const userCount = db.users.filter((u) => u.spaceId === spaceId).length;
    const space = db.spaces[spaceId];
    const hasOpenInvite = Boolean(
      userCount < 2 &&
        space?.inviteCodeHash &&
        space.inviteExpiresAt &&
        new Date(space.inviteExpiresAt).getTime() > Date.now(),
    );
    return {
      initialized: true,
      userCount,
      maxUsers: 2,
      hasOpenInvite,
      storageMode: 'local',
      mediaMode: isCloudinaryConfigured() ? 'cloudinary' : 'local',
    };
  }

  const totalUsers = db.users.length;
  const defaultUserCount = db.users.filter((u) => u.spaceId === DEFAULT_SPACE_ID).length;
  const hasOpenInvite = Object.values(db.spaces).some(
    (s) =>
      Boolean(s.inviteCodeHash) &&
      Boolean(s.inviteExpiresAt) &&
      new Date(s.inviteExpiresAt!).getTime() > Date.now(),
  );
  return {
    initialized: totalUsers > 0,
    userCount: Math.min(defaultUserCount, 2),
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
  spaceName?: string;
}): Promise<{ user: PublicUser; inviteCode: string }> {
  const mongo = await useMongo();
  if (mongo) {
    const count = await UserModel.countDocuments();
    if (count > 0) {
      throw new Error('SPACE_ALREADY_INITIALIZED');
    }
  } else {
    const db = readLocalDb();
    if (db.users.length > 0) {
      throw new Error('SPACE_ALREADY_INITIALIZED');
    }
  }
  return signupWithNewSpace(input);
}

export async function signupWithNewSpace(input: {
  name: string;
  email: string;
  password: string;
  avatarPreset: AvatarPreset;
  spaceName?: string;
}): Promise<{ user: PublicUser; inviteCode: string }> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.name.trim();
  const spaceName = input.spaceName?.trim() || 'Our Little Space';
  const passwordHash = hashPassword(input.password);
  const inviteCode = generateInviteCode();
  const inviteHash = hashInviteCode(inviteCode);
  const inviteExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
  const userId = crypto.randomUUID();
  const now = new Date();

  const mongo = await useMongo();
  if (mongo) {
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const totalUsers = await UserModel.countDocuments();
    const spaceId = totalUsers === 0 ? DEFAULT_SPACE_ID : crypto.randomUUID();

    try {
      const created = await UserModel.create({
        _id: userId,
        spaceId,
        name: displayName,
        email,
        passwordHash,
        avatar: '',
        avatarPreset: input.avatarPreset,
        role: 'founder',
        createdAt: now,
      });

      await SpaceModel.findByIdAndUpdate(
        spaceId,
        {
          $setOnInsert: {
            _id: spaceId,
            tagline: 'A quiet private corner for two',
            welcomeMessage: 'Leave little notes, favorite moments, and snapshots for each other here.',
            logoStyle: 'cat-duo',
          },
          $set: {
            spaceName,
            inviteCodeHash: inviteHash,
            inviteExpiresAt: inviteExpires,
            updatedAt: now,
          },
        },
        { upsert: true },
      );

      return { user: toPublicUser(mongoUserToRecord(created)), inviteCode };
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        throw new Error('EMAIL_EXISTS');
      }
      throw err;
    }
  }

  const db = readLocalDb();
  if (db.users.some((u) => u.email === email)) {
    throw new Error('EMAIL_EXISTS');
  }

  const spaceId = db.users.length === 0 ? DEFAULT_SPACE_ID : crypto.randomUUID();
  const newUser: StoredUserRecord = {
    id: userId,
    spaceId,
    name: displayName,
    email,
    passwordHash,
    avatar: '',
    avatarPreset: input.avatarPreset,
    role: 'founder',
    createdAt: now.toISOString(),
  };

  db.users.push(newUser);
  const existingSpace = db.spaces[spaceId] ?? defaultSpace(spaceName);
  db.spaces[spaceId] = {
    ...existingSpace,
    spaceName,
    inviteCodeHash: inviteHash,
    inviteExpiresAt: inviteExpires.toISOString(),
    updatedAt: now.toISOString(),
  };
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
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const space = await SpaceModel.findOne({ inviteCodeHash: providedHash });
    if (
      !space ||
      !space.inviteCodeHash ||
      !space.inviteExpiresAt ||
      space.inviteExpiresAt.getTime() < Date.now() ||
      !crypto.timingSafeEqual(Buffer.from(space.inviteCodeHash), Buffer.from(providedHash))
    ) {
      throw new Error('INVALID_INVITE');
    }

    const spaceUsersCount = await UserModel.countDocuments(mongoSpaceFilter(space._id));
    if (spaceUsersCount >= 2) {
      throw new Error('SPACE_FULL');
    }

    try {
      const created = await UserModel.create({
        _id: userId,
        spaceId: space._id,
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
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        throw new Error('EMAIL_EXISTS');
      }
      throw err;
    }
  }

  const db = readLocalDb();
  if (db.users.some((u) => u.email === email)) {
    throw new Error('EMAIL_EXISTS');
  }

  let matchedSpaceId: string | null = null;
  for (const [candidateSpaceId, candidateSpace] of Object.entries(db.spaces)) {
    if (
      candidateSpace.inviteCodeHash &&
      candidateSpace.inviteCodeHash.length === providedHash.length &&
      crypto.timingSafeEqual(Buffer.from(candidateSpace.inviteCodeHash), Buffer.from(providedHash))
    ) {
      if (
        candidateSpace.inviteExpiresAt &&
        new Date(candidateSpace.inviteExpiresAt).getTime() >= Date.now()
      ) {
        matchedSpaceId = candidateSpaceId;
        break;
      }
    }
  }

  if (!matchedSpaceId) {
    throw new Error('INVALID_INVITE');
  }

  const spaceUsersCount = db.users.filter((u) => u.spaceId === matchedSpaceId).length;
  if (spaceUsersCount >= 2) {
    throw new Error('SPACE_FULL');
  }

  const newUser: StoredUserRecord = {
    id: userId,
    spaceId: matchedSpaceId,
    name: input.name.trim(),
    email,
    passwordHash,
    avatar: '',
    avatarPreset: input.avatarPreset,
    role: 'partner',
    createdAt: now.toISOString(),
  };
  db.users.push(newUser);
  db.spaces[matchedSpaceId] = {
    ...db.spaces[matchedSpaceId],
    inviteCodeHash: null,
    inviteExpiresAt: null,
    updatedAt: now.toISOString(),
  };
  writeLocalDb(db);
  return toPublicUser(newUser);
}

export async function rotatePartnerInvite(requesterId: string, spaceId: string): Promise<string> {
  const inviteCode = generateInviteCode();
  const inviteHash = hashInviteCode(inviteCode);
  const inviteExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const mongo = await useMongo();
  if (mongo) {
    const user = await UserModel.findById(requesterId);
    if (!user || (user.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error('UNAUTHORIZED');
    }
    const count = await UserModel.countDocuments(mongoSpaceFilter(spaceId));
    if (count >= 2) throw new Error('SPACE_FULL');
    await SpaceModel.findByIdAndUpdate(
      spaceId,
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
  const user = db.users.find((u) => u.id === requesterId);
  if (!user || user.spaceId !== spaceId) throw new Error('UNAUTHORIZED');
  if (db.users.filter((u) => u.spaceId === spaceId).length >= 2) throw new Error('SPACE_FULL');
  db.spaces[spaceId] = {
    ...(db.spaces[spaceId] ?? defaultSpace()),
    inviteCodeHash: inviteHash,
    inviteExpiresAt: inviteExpires.toISOString(),
    updatedAt: new Date().toISOString(),
  };
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

export async function listSpaceMembers(spaceId: string): Promise<PublicUser[]> {
  const mongo = await useMongo();
  if (mongo) {
    const users = await UserModel.find(mongoSpaceFilter(spaceId)).sort({ createdAt: 1 });
    return users.map((u) => toPublicUser(mongoUserToRecord(u)));
  }
  const db = readLocalDb();
  return db.users.filter((u) => u.spaceId === spaceId).map(toPublicUser);
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

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const mongo = await useMongo();
  if (mongo) {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('NOT_FOUND');
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }
    user.passwordHash = hashPassword(newPassword);
    await user.save();
    return;
  }

  const db = readLocalDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('NOT_FOUND');
  if (!verifyPassword(currentPassword, db.users[idx].passwordHash)) {
    throw new Error('INVALID_CURRENT_PASSWORD');
  }
  db.users[idx].passwordHash = hashPassword(newPassword);
  writeLocalDb(db);
}

export async function getSpaceSettings(spaceId: string): Promise<SpaceSettings> {
  const mongo = await useMongo();
  if (mongo) {
    let space = await SpaceModel.findById(spaceId);
    if (!space) {
      space = await SpaceModel.create({ _id: spaceId });
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
  const space = db.spaces[spaceId] ?? defaultSpace();
  return {
    spaceName: space.spaceName,
    tagline: space.tagline,
    welcomeMessage: space.welcomeMessage,
    logoStyle: space.logoStyle,
    updatedAt: space.updatedAt,
  };
}

export async function updateSpaceSettings(
  spaceId: string,
  input: {
    spaceName: string;
    tagline: string;
    welcomeMessage: string;
    logoStyle: 'cat-duo' | 'heart' | 'moon';
  },
): Promise<SpaceSettings> {
  const now = new Date();
  const mongo = await useMongo();
  if (mongo) {
    const space = await SpaceModel.findByIdAndUpdate(
      spaceId,
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
  const current = db.spaces[spaceId] ?? defaultSpace();
  db.spaces[spaceId] = {
    ...current,
    spaceName: input.spaceName.trim(),
    tagline: input.tagline.trim(),
    welcomeMessage: input.welcomeMessage.trim(),
    logoStyle: input.logoStyle,
    updatedAt: now.toISOString(),
  };
  writeLocalDb(db);
  return {
    spaceName: db.spaces[spaceId].spaceName,
    tagline: db.spaces[spaceId].tagline,
    welcomeMessage: db.spaces[spaceId].welcomeMessage,
    logoStyle: db.spaces[spaceId].logoStyle,
    updatedAt: db.spaces[spaceId].updatedAt,
  };
}

export async function listNotes(
  spaceId: string,
  options?: {
    search?: string;
    authorId?: string;
    sort?: 'newest' | 'oldest';
  },
): Promise<SharedNote[]> {
  const mongo = await useMongo();
  let usersMap: Map<string, StoredUserRecord>;
  let noteRecords: StoredNoteRecord[];

  if (mongo) {
    const [users, notes] = await Promise.all([
      UserModel.find(mongoSpaceFilter(spaceId)),
      NoteModel.find(mongoSpaceFilter(spaceId)).sort({
        createdAt: options?.sort === 'oldest' ? 1 : -1,
      }),
    ]);
    usersMap = new Map(users.map((u) => [u._id, mongoUserToRecord(u)]));
    noteRecords = notes.map(mongoNoteToRecord);
  } else {
    const db = readLocalDb();
    usersMap = new Map(db.users.filter((u) => u.spaceId === spaceId).map((u) => [u.id, u]));
    noteRecords = db.notes
      .filter((n) => n.spaceId === spaceId)
      .sort((a, b) => {
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
  spaceId: string,
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
    if (!author || (author.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error('UNAUTHORIZED');
    }
    const created = await NoteModel.create({
      _id: noteId,
      spaceId,
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
  const author = db.users.find((u) => u.id === authorId && u.spaceId === spaceId);
  if (!author) throw new Error('UNAUTHORIZED');
  const record: StoredNoteRecord = {
    id: noteId,
    spaceId,
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
  spaceId: string,
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
    if (!existing || (existing.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error('NOT_FOUND');
    }
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
  if (idx === -1 || db.notes[idx].spaceId !== spaceId) throw new Error('NOT_FOUND');
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
  spaceId: string,
): Promise<SharedNote> {
  const now = new Date();
  const mongo = await useMongo();

  if (mongo) {
    const existing = await NoteModel.findById(noteId);
    if (!existing || (existing.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error('NOT_FOUND');
    }
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
  if (idx === -1 || db.notes[idx].spaceId !== spaceId) throw new Error('NOT_FOUND');
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
