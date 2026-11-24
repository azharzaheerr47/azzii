import type {
  AvatarPreset,
  ComplimentCategory,
  ComplimentDrawResult,
  ComplimentItem,
  ComplimentsOverview,
  NoteImage,
  NoteTone,
  PublicUser,
  SharedNote,
  SpaceSettings,
  SpaceStatus,
  StickerId,
} from '../types/index';

const BASE_HEADERS: Record<string, string> = {
  'X-Requested-With': 'XMLHttpRequest',
};

// Held strictly in JS memory (never localStorage/sessionStorage) so embedded iframes
// that block third-party cookies remain authenticated seamlessly alongside HttpOnly cookies.
let memorySessionToken: string | null = null;

export function getMemorySessionToken(): string | null {
  return memorySessionToken;
}

export type ApiErrorKind = 'http' | 'database' | 'network' | 'invalid_response';

export class ApiRequestError extends Error {
  readonly status: number | null;
  readonly kind: ApiErrorKind;
  readonly method: string;
  readonly endpoint: string;

  constructor(
    message: string,
    options: {
      status: number | null;
      kind: ApiErrorKind;
      method: string;
      endpoint: string;
    },
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.kind = options.kind;
    this.method = options.method;
    this.endpoint = options.endpoint;
  }
}

function defaultHttpErrorMessage(status: number, method: string, endpoint: string): string {
  switch (status) {
    case 401:
      return 'Authentication required (HTTP 401). Please sign in.';
    case 403:
      return 'Access denied (HTTP 403).';
    case 404:
      return `API route not found: ${method} ${endpoint} returned HTTP 404. Verify Vercel serverless deployment and routing.`;
    case 405:
      return `Method not allowed: ${method} ${endpoint} returned HTTP 405.`;
    case 503:
      return 'Database or backend service is unavailable (HTTP 503).';
    case 500:
      return `Server error on ${method} ${endpoint} (HTTP 500). Check deployment logs and environment variables.`;
    default:
      return `Request failed (HTTP ${status}) on ${method} ${endpoint}.`;
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...BASE_HEADERS,
        ...(memorySessionToken ? { Authorization: `Bearer ${memorySessionToken}` } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiRequestError(
      'Unable to reach the server. Check your internet connection and verify the app URL is reachable.',
      { status: null, kind: 'network', method, endpoint: url },
    );
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const rawText = await res.text();
  let data: Record<string, unknown> | null = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const serverMsg = data && typeof data.error === 'string' ? data.error : null;
    const kind: ApiErrorKind = res.status === 503 ? 'database' : 'http';
    throw new ApiRequestError(serverMsg || defaultHttpErrorMessage(res.status, method, url), {
      status: res.status,
      kind,
      method,
      endpoint: url,
    });
  }

  if (data === null || (!isJson && rawText.trim().startsWith('<'))) {
    throw new ApiRequestError(
      `Invalid response format from ${method} ${url} (expected JSON, received HTML/non-JSON). Verify Vercel API routing.`,
      { status: res.status, kind: 'invalid_response', method, endpoint: url },
    );
  }

  return data as T;
}

export interface SessionContextData {
  user: PublicUser;
  members: PublicUser[];
  space: SpaceSettings;
  status: SpaceStatus;
  onlineUserIds: string[];
}

export const api = {
  getAuthStatus: () => requestJson<SpaceStatus>('/api/auth/status'),

  setupFounder: async (payload: {
    name: string;
    email: string;
    password: string;
    avatarPreset: AvatarPreset;
    spaceName?: string;
  }) => {
    const res = await requestJson<{ user: PublicUser; inviteCode: string; sessionToken?: string }>(
      '/api/auth/setup',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    if (res.sessionToken) memorySessionToken = res.sessionToken;
    return res;
  },

  signup: async (payload: {
    name: string;
    email: string;
    password: string;
    avatarPreset: AvatarPreset;
    spaceName?: string;
  }) => {
    const res = await requestJson<{ user: PublicUser; inviteCode: string; sessionToken?: string }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    if (res.sessionToken) memorySessionToken = res.sessionToken;
    return res;
  },

  redeemInvite: async (payload: {
    inviteCode: string;
    name: string;
    email: string;
    password: string;
    avatarPreset: AvatarPreset;
  }) => {
    const res = await requestJson<{ user: PublicUser; sessionToken?: string }>(
      '/api/auth/redeem-invite',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    if (res.sessionToken) memorySessionToken = res.sessionToken;
    return res;
  },

  login: async (payload: { email: string; password: string }) => {
    const res = await requestJson<{ user: PublicUser; sessionToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.sessionToken) memorySessionToken = res.sessionToken;
    return res;
  },

  logout: async () => {
    memorySessionToken = null;
    return requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  getMe: () => requestJson<SessionContextData>('/api/auth/me'),

  rotateInvite: () =>
    requestJson<{ inviteCode: string }>('/api/space/invite', { method: 'POST' }),

  updateSpace: (payload: {
    spaceName: string;
    tagline: string;
    welcomeMessage: string;
    logoStyle: 'cat-duo' | 'heart' | 'moon' | 'sunflower';
  }) =>
    requestJson<{ space: SpaceSettings }>('/api/space', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateProfile: (payload: {
    name: string;
    avatarPreset: AvatarPreset;
    avatar?: string;
    bio?: string;
  }) =>
    requestJson<{ user: PublicUser }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    requestJson<{ ok: boolean }>('/api/profile/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  listCompliments: () => requestJson<ComplimentsOverview>('/api/compliments'),

  createCompliment: (payload: { content: string; category: ComplimentCategory }) =>
    requestJson<{ compliment: ComplimentItem }>('/api/compliments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  drawCompliment: () =>
    requestJson<ComplimentDrawResult>('/api/compliments/draw', {
      method: 'POST',
    }),

  deleteCompliment: (complimentId: string) =>
    requestJson<{ ok: boolean; id: string }>(
      `/api/compliments/${encodeURIComponent(complimentId)}`,
      { method: 'DELETE' },
    ),

  listNotes: (params?: { search?: string; authorId?: string; sort?: 'newest' | 'oldest' }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.authorId && params.authorId !== 'all') query.set('authorId', params.authorId);
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return requestJson<{ notes: SharedNote[] }>(`/api/notes${qs ? `?${qs}` : ''}`);
  },

  createNote: (payload: {
    content: string;
    tone: NoteTone;
    sticker: StickerId | null;
    images: NoteImage[];
  }) =>
    requestJson<{ note: SharedNote }>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateNote: (
    noteId: string,
    payload: {
      content: string;
      tone?: NoteTone;
      sticker?: StickerId | null;
      images?: NoteImage[];
    },
  ) =>
    requestJson<{ note: SharedNote }>(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  softDeleteNote: (noteId: string) =>
    requestJson<{ note: SharedNote }>(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: 'DELETE',
    }),

  deletePendingUpload: (publicId: string) =>
    requestJson<{ ok: boolean }>('/api/upload', {
      method: 'DELETE',
      body: JSON.stringify({ publicId }),
    }),

  uploadImages: (files: File[], onProgress?: (percent: number) => void): Promise<NoteImage[]> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('images', file);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.withCredentials = true;
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      if (memorySessionToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${memorySessionToken}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 413) {
          reject(
            new Error(
              'Image upload exceeds the 4 MB serverless request limit. Try uploading fewer or smaller photos at once.',
            ),
          );
          return;
        }
        try {
          const parsed = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && Array.isArray(parsed.images)) {
            resolve(parsed.images as NoteImage[]);
          } else {
            reject(new Error(parsed.error || `Upload failed (${xhr.status})`));
          }
        } catch {
          reject(new Error('Invalid upload response from server.'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error while uploading images.'));
      xhr.send(formData);
    });
  },
};
