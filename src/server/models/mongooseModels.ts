import mongoose, { Schema, type Model, type Document } from 'mongoose';
import type { AvatarPreset, NoteTone, StickerId } from '../../types/index';

export interface IUserDoc extends Document<string> {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string;
  avatarPreset: AvatarPreset;
  role: 'founder' | 'partner';
  createdAt: Date;
}

export interface IImageAsset {
  id: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  uploadedAt: Date;
}

export interface INoteDoc extends Document<string> {
  _id: string;
  authorId: string;
  content: string;
  tone: NoteTone;
  images: IImageAsset[];
  sticker: StickerId | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
  isDeleted: boolean;
}

export interface ISpaceDoc extends Document<string> {
  _id: string;
  spaceName: string;
  tagline: string;
  welcomeMessage: string;
  logoStyle: 'cat-duo' | 'heart' | 'moon';
  inviteCodeHash: string | null;
  inviteExpiresAt: Date | null;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    avatarPreset: {
      type: String,
      enum: ['bat-cat', 'bow-cat', 'lavender', 'blush', 'sky'],
      default: 'bat-cat',
    },
    role: { type: String, enum: ['founder', 'partner'], required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

const ImageSubSchema = new Schema<IImageAsset>(
  {
    id: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    format: { type: String, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const NoteSchema = new Schema<INoteDoc>(
  {
    _id: { type: String, required: true },
    authorId: { type: String, required: true, ref: 'User' },
    content: { type: String, default: '', maxlength: 4000 },
    tone: { type: String, enum: ['white', 'lavender', 'pink', 'blue'], default: 'white' },
    images: { type: [ImageSubSchema], default: [] },
    sticker: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { versionKey: false },
);

// Required MongoDB indexes
NoteSchema.index({ createdAt: -1 });
NoteSchema.index({ authorId: 1 });
NoteSchema.index({ isDeleted: 1 });

const SpaceSchema = new Schema<ISpaceDoc>(
  {
    _id: { type: String, required: true },
    spaceName: { type: String, default: 'Our Little Space' },
    tagline: { type: String, default: 'A quiet private corner for two' },
    welcomeMessage: {
      type: String,
      default: 'Leave little notes, favorite moments, and snapshots for each other here.',
    },
    logoStyle: { type: String, enum: ['cat-duo', 'heart', 'moon'], default: 'cat-duo' },
    inviteCodeHash: { type: String, default: null },
    inviteExpiresAt: { type: Date, default: null },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const UserModel: Model<IUserDoc> =
  (mongoose.models.User as Model<IUserDoc>) || mongoose.model<IUserDoc>('User', UserSchema);

export const NoteModel: Model<INoteDoc> =
  (mongoose.models.Note as Model<INoteDoc>) || mongoose.model<INoteDoc>('Note', NoteSchema);

export const SpaceModel: Model<ISpaceDoc> =
  (mongoose.models.Space as Model<ISpaceDoc>) || mongoose.model<ISpaceDoc>('Space', SpaceSchema);

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & { __mongooseCache?: MongooseCache };

export class DatabaseConnectionError extends Error {
  readonly code: 'MONGODB_NOT_CONFIGURED' | 'MONGODB_UNREACHABLE';

  constructor(code: 'MONGODB_NOT_CONFIGURED' | 'MONGODB_UNREACHABLE', message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.code = code;
  }
}

export async function connectMongoDB(uri: string): Promise<typeof mongoose> {
  if (!globalWithMongoose.__mongooseCache) {
    globalWithMongoose.__mongooseCache = { conn: null, promise: null };
  }
  const cache = globalWithMongoose.__mongooseCache;
  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cache.conn = null;
    cache.promise = null;
  }
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      })
      .catch((err) => {
        cache.conn = null;
        cache.promise = null;
        const safeName = err instanceof Error ? err.name : 'MongoError';
        console.error('[mongodb] Connection failed:', safeName);
        throw new DatabaseConnectionError(
          'MONGODB_UNREACHABLE',
          'Could not connect to MongoDB Atlas. Verify MONGODB_URI and Atlas Network Access (allow 0.0.0.0/0).',
        );
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function pingMongoDB(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    return { configured: false, connected: false };
  }
  try {
    const conn = await connectMongoDB(uri);
    await conn.connection.db?.admin().ping();
    return { configured: true, connected: true };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error:
        err instanceof DatabaseConnectionError
          ? err.message
          : 'MongoDB connection failed',
    };
  }
}
