import mongoose, { Schema, type Model, type Document } from 'mongoose';
import type {
  AvatarPreset,
  ComplimentCategory,
  NoteTone,
  StickerId,
  UserAppearance,
} from '../../types/index';

export interface IUserDoc extends Document<string> {
  _id: string;
  spaceId: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string;
  avatarPreset: AvatarPreset;
  bio?: string;
  role: 'founder' | 'partner';
  appearance?: UserAppearance;
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
  spaceId: string;
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
  logoStyle: 'cat-duo' | 'heart' | 'moon' | 'sunflower';
  inviteCodeHash: string | null;
  inviteExpiresAt: Date | null;
  updatedAt: Date;
}

export interface IComplimentDoc extends Document<string> {
  _id: string;
  spaceId: string;
  authorId: string;
  recipientId: string;
  content: string;
  category: ComplimentCategory;
  createdAt: Date;
  isDeleted: boolean;
}

export interface IComplimentDrawDoc extends Document<string> {
  _id: string;
  spaceId: string;
  complimentId: string;
  recipientId: string;
  drawnAt: Date;
  cycleNumber: number;
}

const CustomBackgroundSubSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    position: {
      type: String,
      enum: ['center', 'top', 'bottom', 'left', 'right'],
      default: 'center',
    },
    scale: { type: Number, default: 100 },
    blur: { type: Number, default: 0 },
    brightness: { type: Number, default: 95 },
    overlayOpacity: { type: Number, default: 45 },
    overlayMode: { type: String, enum: ['dark', 'light'], default: 'dark' },
  },
  { _id: false },
);

const AppearanceSubSchema = new Schema(
  {
    themeMode: {
      type: String,
      enum: ['system', 'dark', 'light', 'custom'],
      default: 'system',
    },
    romanticMode: { type: Boolean, default: false },
    customBackground: { type: CustomBackgroundSubSchema, default: null },
  },
  { _id: false },
);

const UserSchema = new Schema<IUserDoc>(
  {
    _id: { type: String, required: true },
    spaceId: { type: String, required: true, default: 'primary-space', index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: '' },
    avatarPreset: {
      type: String,
      enum: ['bat-cat', 'bow-cat', 'lavender', 'blush', 'sky'],
      default: 'bat-cat',
    },
    bio: { type: String, default: '', maxlength: 160 },
    role: { type: String, enum: ['founder', 'partner'], required: true },
    appearance: {
      type: AppearanceSubSchema,
      default: () => ({
        themeMode: 'system',
        romanticMode: false,
        customBackground: null,
      }),
    },
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
    spaceId: { type: String, required: true, default: 'primary-space', index: true },
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
NoteSchema.index({ spaceId: 1, createdAt: -1 });
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
    logoStyle: {
      type: String,
      enum: ['cat-duo', 'heart', 'moon', 'sunflower'],
      default: 'cat-duo',
    },
    inviteCodeHash: { type: String, default: null, index: true },
    inviteExpiresAt: { type: Date, default: null },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

const ComplimentSchema = new Schema<IComplimentDoc>(
  {
    _id: { type: String, required: true },
    spaceId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, ref: 'User' },
    recipientId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 500 },
    category: { type: String, default: 'Just because' },
    createdAt: { type: Date, default: () => new Date() },
    isDeleted: { type: Boolean, default: false },
  },
  { versionKey: false },
);

ComplimentSchema.index({ spaceId: 1, recipientId: 1, isDeleted: 1 });
ComplimentSchema.index({ spaceId: 1, authorId: 1, createdAt: -1 });

const ComplimentDrawSchema = new Schema<IComplimentDrawDoc>(
  {
    _id: { type: String, required: true },
    spaceId: { type: String, required: true, index: true },
    complimentId: { type: String, required: true, ref: 'Compliment' },
    recipientId: { type: String, required: true, ref: 'User' },
    drawnAt: { type: Date, default: () => new Date() },
    cycleNumber: { type: Number, required: true, default: 1 },
  },
  { versionKey: false },
);

ComplimentDrawSchema.index({ spaceId: 1, recipientId: 1, drawnAt: -1 });

export const UserModel: Model<IUserDoc> =
  (mongoose.models.User as Model<IUserDoc>) || mongoose.model<IUserDoc>('User', UserSchema);

export const NoteModel: Model<INoteDoc> =
  (mongoose.models.Note as Model<INoteDoc>) || mongoose.model<INoteDoc>('Note', NoteSchema);

export const SpaceModel: Model<ISpaceDoc> =
  (mongoose.models.Space as Model<ISpaceDoc>) || mongoose.model<ISpaceDoc>('Space', SpaceSchema);

export const ComplimentModel: Model<IComplimentDoc> =
  (mongoose.models.Compliment as Model<IComplimentDoc>) ||
  mongoose.model<IComplimentDoc>('Compliment', ComplimentSchema);

export const ComplimentDrawModel: Model<IComplimentDrawDoc> =
  (mongoose.models.ComplimentDraw as Model<IComplimentDrawDoc>) ||
  mongoose.model<IComplimentDrawDoc>('ComplimentDraw', ComplimentDrawSchema);

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
