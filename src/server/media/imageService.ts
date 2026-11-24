import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import type { NoteImage } from '../../types/index';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const LOCAL_MEDIA_DIR =
  process.env.VERCEL === '1'
    ? path.resolve(os.tmpdir(), '.data', 'media')
    : path.resolve(process.cwd(), '.data', 'media');

function cleanEnvVal(raw: string | undefined): string {
  return (raw || '').trim().replace(/^["']|["']$/g, '');
}

function resolveCloudinaryCredentials(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} | null {
  const cloudName = cleanEnvVal(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnvVal(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvVal(process.env.CLOUDINARY_API_SECRET);
  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  const rawUrl = cleanEnvVal(process.env.CLOUDINARY_URL);
  if (rawUrl.startsWith('cloudinary://')) {
    try {
      const parsed = new URL(rawUrl);
      const uName = decodeURIComponent(parsed.hostname || '');
      const uKey = decodeURIComponent(parsed.username || '');
      const uSecret = decodeURIComponent(parsed.password || '');
      if (uName && uKey && uSecret) {
        return { cloudName: uName, apiKey: uKey, apiSecret: uSecret };
      }
    } catch {
      // Invalid CLOUDINARY_URL format
    }
  }
  return null;
}

export function isCloudinaryConfigured(): boolean {
  return resolveCloudinaryCredentials() !== null;
}

function configureCloudinary(): void {
  const creds = resolveCloudinaryCredentials();
  if (!creds) return;
  cloudinary.config({
    cloud_name: creds.cloudName,
    api_key: creds.apiKey,
    api_secret: creds.apiSecret,
    secure: true,
  });
}

export class ImageUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadValidationError';
  }
}

export class ImageStorageError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'ImageStorageError';
    this.statusCode = statusCode;
  }
}

function extractCloudinaryErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const obj = err as { error?: { message?: string }; message?: string };
    if (obj.error?.message) return obj.error.message;
    if (obj.message) return obj.message;
  }
  return 'Cloudinary image upload failed.';
}

function detectImageFormatFromMagicBytes(buf: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

function parseImageDimensions(
  buf: Buffer,
  format: 'jpeg' | 'png' | 'webp',
): { width: number; height: number } {
  try {
    if (format === 'png' && buf.length >= 24) {
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
      };
    }
    if (format === 'jpeg') {
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) break;
        const marker = buf[offset + 1];
        const segLen = buf.readUInt16BE(offset + 2);
        if (
          marker === 0xc0 ||
          marker === 0xc1 ||
          marker === 0xc2 ||
          marker === 0xc3
        ) {
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7),
          };
        }
        if (segLen < 2) break;
        offset += 2 + segLen;
      }
    }
    if (format === 'webp' && buf.length >= 30) {
      const chunk = buf.subarray(12, 16).toString('ascii');
      if (chunk === 'VP8X') {
        const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return { width: w, height: h };
      }
    }
  } catch {
    // Fallback below
  }
  return { width: 1200, height: 900 };
}

export function validateUploadedImage(
  buffer: Buffer,
  mimetype: string,
): { format: 'jpeg' | 'png' | 'webp'; width: number; height: number } {
  if (!ALLOWED_MIME_TYPES.has(mimetype.toLowerCase())) {
    throw new ImageUploadValidationError('Only JPEG, PNG, and WebP images are allowed.');
  }
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageUploadValidationError('Image size must be between 1 byte and 5 MB.');
  }
  const detected = detectImageFormatFromMagicBytes(buffer);
  if (!detected) {
    throw new ImageUploadValidationError(
      'Invalid image file contents. Please upload a real JPEG, PNG, or WebP file.',
    );
  }
  const dims = parseImageDimensions(buffer, detected);
  return {
    format: detected,
    width: Math.max(1, dims.width),
    height: Math.max(1, dims.height),
  };
}

export async function storeImageBuffer(
  buffer: Buffer,
  mimetype: string,
  folder: 'our-little-space/notes' | 'our-little-space/themes' = 'our-little-space/notes',
): Promise<NoteImage> {
  const { format, width, height } = validateUploadedImage(buffer, mimetype);
  const id = crypto.randomUUID();
  const uploadedAt = new Date().toISOString();

  if (isCloudinaryConfigured()) {
    configureCloudinary();
    try {
      const result = await new Promise<{
        public_id: string;
        secure_url: string;
        width: number;
        height: number;
        format: string;
      }>((resolve, reject) => {
        let settled = false;
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            timeout: 15000,
          },
          (error, res) => {
            if (settled) return;
            settled = true;
            if (error || !res) {
              reject(error || new Error('Cloudinary upload failed'));
              return;
            }
            resolve(res);
          },
        );
        stream.on('error', (streamErr) => {
          if (settled) return;
          settled = true;
          reject(streamErr);
        });
        stream.end(buffer);
      });

      return {
        id,
        cloudinaryPublicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width || width,
        height: result.height || height,
        format: result.format || format,
        uploadedAt,
      };
    } catch (err) {
      const msg = extractCloudinaryErrorMessage(err);
      console.error('[cloudinary-upload-error]', { folder, message: msg });
      throw new ImageStorageError(
        'Could not store image on media server. Please verify Cloudinary configuration or try a smaller image.',
        502,
      );
    }
  }

  // Local preview storage fallback (strictly confined to .data/media with UUID filename)
  fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
  const filename = `${id}.${format}`;
  const targetPath = path.resolve(LOCAL_MEDIA_DIR, filename);
  if (!targetPath.startsWith(LOCAL_MEDIA_DIR + path.sep)) {
    throw new Error('Invalid media path');
  }
  fs.writeFileSync(targetPath, buffer);

  return {
    id,
    cloudinaryPublicId: `local/${filename}`,
    secureUrl: `/api/media/${filename}`,
    width,
    height,
    format,
    uploadedAt,
  };
}

export async function deleteStoredImage(publicId: string): Promise<void> {
  if (!publicId) return;
  if (publicId.startsWith('local/')) {
    const safeFilename = path.basename(publicId.slice('local/'.length));
    const targetPath = path.resolve(LOCAL_MEDIA_DIR, safeFilename);
    if (targetPath.startsWith(LOCAL_MEDIA_DIR + path.sep) && fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return;
  }

  if (isCloudinaryConfigured()) {
    configureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => undefined);
  }
}

export function resolveSafeLocalMediaPath(filename: string): string | null {
  if (!/^[0-9a-f-]{36}\.(jpeg|png|webp)$/i.test(filename)) {
    return null;
  }
  const resolved = path.resolve(LOCAL_MEDIA_DIR, filename);
  if (!resolved.startsWith(LOCAL_MEDIA_DIR + path.sep)) {
    return null;
  }
  if (!fs.existsSync(resolved)) {
    return null;
  }
  return resolved;
}

export async function pingCloudinary(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  if (!isCloudinaryConfigured()) {
    return { configured: false, connected: false };
  }
  try {
    configureCloudinary();
    const res = await cloudinary.api.ping();
    return { configured: true, connected: res?.status === 'ok' };
  } catch (err: unknown) {
    const msg =
      (err as { error?: { message?: string }; message?: string })?.error?.message ||
      (err instanceof Error ? err.message : 'Cloudinary ping failed');
    return {
      configured: true,
      connected: false,
      error: msg,
    };
  }
}
