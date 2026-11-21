export type NoteTone = 'white' | 'lavender' | 'pink' | 'blue';

export type StickerId =
  | 'happy-cat'
  | 'sad-cat'
  | 'crying-cat'
  | 'angry-cat'
  | 'blushing-cat'
  | 'sleeping-cat'
  | 'love-cats'
  | 'hugging-cats'
  | 'sweet-heart'
  | 'sparkle-star'
  | 'pastel-flower'
  | 'pink-bow'
  | 'bat-cat'
  | 'cozy-moon';

export type AvatarPreset = 'bat-cat' | 'bow-cat' | 'lavender' | 'blush' | 'sky';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarPreset: AvatarPreset;
  role: 'founder' | 'partner';
  createdAt: string;
}

export interface NoteImage {
  id: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  uploadedAt: string;
}

export interface SharedNote {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorAvatarPreset: AvatarPreset;
  content: string;
  tone: NoteTone;
  images: NoteImage[];
  sticker: StickerId | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  isDeleted: boolean;
}

export interface SpaceSettings {
  spaceName: string;
  tagline: string;
  welcomeMessage: string;
  logoStyle: 'cat-duo' | 'heart' | 'moon';
  updatedAt: string;
}

export interface SpaceStatus {
  initialized: boolean;
  userCount: number;
  maxUsers: number;
  hasOpenInvite: boolean;
  storageMode: 'mongodb' | 'local';
  mediaMode: 'cloudinary' | 'local';
  authenticated?: boolean;
  realtimeMode?: 'ws' | 'poll';
}

export type NotesSortOrder = 'newest' | 'oldest';
export type NotesLayoutMode = 'feed' | 'grid';

export interface NoteFilterState {
  search: string;
  authorId: string;
  dateFilter: string; // YYYY-MM-DD or ''
  sort: NotesSortOrder;
}

export type RealtimeEvent =
  | { type: 'note:created'; payload: SharedNote }
  | { type: 'note:updated'; payload: SharedNote }
  | { type: 'note:deleted'; payload: SharedNote }
  | { type: 'space:updated'; payload: SpaceSettings }
  | { type: 'user:updated'; payload: PublicUser }
  | { type: 'presence:update'; payload: { onlineUserIds: string[] } };
