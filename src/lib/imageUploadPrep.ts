export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

// Vercel serverless functions reject request bodies > 4.5 MB including multipart boundaries.
// Keeping each prepared upload <= 3.8 MB ensures reliable delivery across Vercel & mobile connections.
export const MAX_SERVERLESS_UPLOAD_BYTES = Math.floor(3.8 * 1024 * 1024);
export const AUTO_OPTIMIZE_THRESHOLD_BYTES = Math.floor(2.4 * 1024 * 1024);
export const MAX_SOURCE_SELECTION_BYTES = 20 * 1024 * 1024;

export function validateImageFileCandidate(file: {
  type: string;
  size: number;
}): { valid: true } | { valid: false; error: string } {
  const normalizedType = (file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedType)) {
    return {
      valid: false,
      error: 'Please select a JPEG, PNG, or WebP image.',
    };
  }
  if (file.size <= 0) {
    return {
      valid: false,
      error: 'The selected image file is empty.',
    };
  }
  if (file.size > MAX_SOURCE_SELECTION_BYTES) {
    return {
      valid: false,
      error: 'Please choose an image smaller than 20 MB.',
    };
  }
  return { valid: true };
}

function replaceExtension(filename: string, ext: 'webp' | 'jpg'): string {
  const base = filename.replace(/\.[^.]+$/, '') || 'photo';
  return `${base}.${ext}`;
}

async function loadImageDimensionsAndDraw(
  file: File,
  maxDimension: number,
  outputMime: 'image/webp' | 'image/jpeg',
  quality: number,
): Promise<Blob | null> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode selected image.'));
      el.src = objectUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return null;

    const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, targetW, targetH);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), outputMime, quality);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareImageForUpload(
  file: File,
  options?: {
    maxBytes?: number;
    autoOptimizeThresholdBytes?: number;
    maxDimension?: number;
  },
): Promise<File> {
  const check = validateImageFileCandidate(file);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const maxBytes = options?.maxBytes ?? MAX_SERVERLESS_UPLOAD_BYTES;
  const threshold = options?.autoOptimizeThresholdBytes ?? AUTO_OPTIMIZE_THRESHOLD_BYTES;
  const maxDimension = options?.maxDimension ?? 1920;

  if (file.size <= threshold) {
    return file;
  }

  // Try optimizing oversized camera-roll photos client-side before sending to serverless upload
  const preferredMime: 'image/webp' | 'image/jpeg' =
    file.type.toLowerCase() === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const ext: 'webp' | 'jpg' = preferredMime === 'image/webp' ? 'webp' : 'jpg';

  const attempts: Array<{ dim: number; quality: number }> = [
    { dim: maxDimension, quality: 0.86 },
    { dim: Math.min(maxDimension, 1600), quality: 0.76 },
    { dim: Math.min(maxDimension, 1280), quality: 0.68 },
  ];

  let bestBlob: Blob | null = null;
  for (const attempt of attempts) {
    const blob = await loadImageDimensionsAndDraw(
      file,
      attempt.dim,
      preferredMime,
      attempt.quality,
    ).catch(() => null);
    if (!blob) break;
    bestBlob = blob;
    if (blob.size <= maxBytes) {
      return new File([blob], replaceExtension(file.name, ext), {
        type: blob.type || preferredMime,
        lastModified: Date.now(),
      });
    }
  }

  if (bestBlob && bestBlob.size <= maxBytes) {
    return new File([bestBlob], replaceExtension(file.name, ext), {
      type: bestBlob.type || preferredMime,
      lastModified: Date.now(),
    });
  }

  if (file.size <= maxBytes) {
    return file;
  }

  throw new Error(
    'This photo exceeds the 3.8 MB serverless upload limit even after optimization. Please choose a smaller photo.',
  );
}
