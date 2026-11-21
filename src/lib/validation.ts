import { z } from 'zod';

export const STICKER_IDS = [
  'happy-cat',
  'sad-cat',
  'crying-cat',
  'angry-cat',
  'blushing-cat',
  'sleeping-cat',
  'love-cats',
  'hugging-cats',
  'sweet-heart',
  'sparkle-star',
  'pastel-flower',
  'pink-bow',
  'bat-cat',
  'cozy-moon',
] as const;

export const NOTE_TONES = ['white', 'lavender', 'pink', 'blue'] as const;
export const AVATAR_PRESETS = ['bat-cat', 'bow-cat', 'lavender', 'blush', 'sky'] as const;

export const setupAccountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Name must be 40 characters or fewer'),
  email: z.string().trim().email('Please enter a valid email address').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  avatarPreset: z.enum(AVATAR_PRESETS).default('bat-cat'),
});

export const redeemInviteSchema = setupAccountSchema.extend({
  inviteCode: z.string().trim().min(6, 'Invite code is required').max(64),
  avatarPreset: z.enum(AVATAR_PRESETS).default('bow-cat'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const imageAttachmentSchema = z.object({
  id: z.string().trim().min(1).max(120),
  cloudinaryPublicId: z.string().trim().min(1).max(240),
  secureUrl: z.string().trim().min(1).max(1000),
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
  format: z.string().trim().min(1).max(20),
  uploadedAt: z.string().trim().min(1),
});

export const createNoteSchema = z
  .object({
    content: z.string().trim().max(4000, 'Note is too long (max 4,000 characters)').default(''),
    tone: z.enum(NOTE_TONES).default('white'),
    sticker: z.enum(STICKER_IDS).nullable().default(null),
    images: z.array(imageAttachmentSchema).max(4, 'Up to 4 images per note').default([]),
  })
  .refine(
    (data) => data.content.length > 0 || data.images.length > 0 || data.sticker !== null,
    { message: 'Write a note, attach an image, or pick a sticker before posting.' },
  );

export const updateNoteSchema = z
  .object({
    content: z.string().trim().max(4000, 'Note is too long (max 4,000 characters)'),
    tone: z.enum(NOTE_TONES).optional(),
    sticker: z.enum(STICKER_IDS).nullable().optional(),
    images: z.array(imageAttachmentSchema).max(4).optional(),
  })
  .refine(
    (data) =>
      data.content.length > 0 ||
      (data.images && data.images.length > 0) ||
      (data.sticker !== null && data.sticker !== undefined),
    { message: 'Note cannot be completely empty.' },
  );

export const updateSpaceSettingsSchema = z.object({
  spaceName: z.string().trim().min(1, 'Space name is required').max(48),
  tagline: z.string().trim().max(100).default('Private Space for Two'),
  welcomeMessage: z.string().trim().min(1).max(240),
  logoStyle: z.enum(['cat-duo', 'heart', 'moon']).default('cat-duo'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  avatarPreset: z.enum(AVATAR_PRESETS),
  avatar: z.string().trim().max(1000).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100),
});
