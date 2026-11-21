import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {
  createNoteSchema,
  loginSchema,
  redeemInviteSchema,
  setupAccountSchema,
  updateNoteSchema,
  updateProfileSchema,
  updateSpaceSettingsSchema,
} from '../../lib/validation';
import type { PublicUser } from '../../types/index';
import {
  clearSessionCookie,
  extractAuthToken,
  setSessionCookie,
  signSessionToken,
  verifySessionToken,
} from '../auth/crypto';
import {
  authenticateUser,
  createFounderAccount,
  createNote,
  getSpaceSettings,
  getSpaceStatus,
  getUserById,
  listNotes,
  listSpaceMembers,
  redeemPartnerInvite,
  rotatePartnerInvite,
  softDeleteNoteByAuthor,
  updateNoteByAuthor,
  updateSpaceSettings,
  updateUserProfile,
} from '../db/store';
import {
  deleteStoredImage,
  pingCloudinary,
  resolveSafeLocalMediaPath,
  storeImageBuffer,
} from '../media/imageService';
import { pingMongoDB } from '../models/mongooseModels';
import { realtimeHub } from '../realtime/hub';

interface AuthedRequest extends Request {
  authUser?: PublicUser;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 4,
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const requestedWith = req.headers['x-requested-with'];
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;

  if (requestedWith === 'XMLHttpRequest') {
    next();
    return;
  }

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      // Fall through to reject
    }
  }

  res.status(403).json({ error: 'Invalid request origin.' });
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractAuthToken(req);
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const user = await getUserById(payload.sub);
  if (!user) {
    res.status(401).json({ error: 'Session is no longer valid.' });
    return;
  }

  req.authUser = user;
  next();
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  router.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.use(verifyCsrf);

  // Health check for MongoDB Atlas & Cloudinary connectivity (no secrets exposed)
  router.get('/health', async (_req, res) => {
    const [mongodb, cloudinary] = await Promise.all([pingMongoDB(), pingCloudinary()]);
    const ok =
      (!mongodb.configured || mongodb.connected) &&
      (!cloudinary.configured || cloudinary.connected);
    res.status(ok ? 200 : 503).json({
      ok,
      mongodb,
      cloudinary,
    });
  });

  // Public space initialization status (no user details exposed)
  router.get('/auth/status', async (req, res) => {
    try {
      const status = await getSpaceStatus();
      const token = extractAuthToken(req);
      const payload = verifySessionToken(token);
      const authedUser = payload ? await getUserById(payload.sub) : null;
      res.json({
        ...status,
        authenticated: Boolean(authedUser),
        realtimeMode: realtimeHub.isWsAttached() ? 'ws' : 'poll',
      });
    } catch {
      res.status(500).json({ error: 'Failed to check space status.' });
    }
  });

  // First-run Account 1 setup
  router.post('/auth/setup', authLimiter, async (req, res) => {
    const parsed = setupAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid setup input.' });
      return;
    }

    try {
      const { user, inviteCode } = await createFounderAccount(parsed.data);
      const token = signSessionToken(user.id, user.role);
      setSessionCookie(req, res, token);
      res.status(201).json({ user, inviteCode, sessionToken: token });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'SPACE_ALREADY_INITIALIZED') {
        res.status(403).json({ error: 'This private space has already been initialized.' });
        return;
      }
      res.status(500).json({ error: 'Failed to create account.' });
    }
  });

  // Partner 2 invite redemption (strictly enforces max 2 accounts)
  router.post('/auth/redeem-invite', authLimiter, async (req, res) => {
    const parsed = redeemInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid invite details.' });
      return;
    }

    try {
      const user = await redeemPartnerInvite(parsed.data);
      const token = signSessionToken(user.id, user.role);
      setSessionCookie(req, res, token);
      realtimeHub.broadcast({ type: 'user:updated', payload: user });
      res.status(201).json({ user, sessionToken: token });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'SPACE_FULL') {
        res.status(403).json({ error: 'This space already has two registered accounts.' });
        return;
      }
      if (msg === 'EMAIL_EXISTS') {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }
      if (msg === 'INVALID_INVITE') {
        res.status(403).json({ error: 'Invalid or expired partner invite code.' });
        return;
      }
      res.status(500).json({ error: 'Unable to redeem invite code.' });
    }
  });

  // Sign in
  router.post('/auth/login', authLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials.' });
      return;
    }

    try {
      const user = await authenticateUser(parsed.data.email, parsed.data.password);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      const token = signSessionToken(user.id, user.role);
      setSessionCookie(req, res, token);
      res.json({ user, sessionToken: token });
    } catch {
      res.status(500).json({ error: 'Sign in failed.' });
    }
  });

  // Sign out
  router.post('/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Current authenticated user + space context
  router.get('/auth/me', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const [members, space, status] = await Promise.all([
        listSpaceMembers(),
        getSpaceSettings(),
        getSpaceStatus(),
      ]);
      res.json({
        user: req.authUser,
        members,
        space,
        status: {
          ...status,
          authenticated: true,
          realtimeMode: realtimeHub.isWsAttached() ? 'ws' : 'poll',
        },
        onlineUserIds: realtimeHub.getOnlineUserIds(),
      });
    } catch {
      res.status(500).json({ error: 'Failed to load profile.' });
    }
  });

  // Rotate partner invite code (only when < 2 users)
  router.post('/space/invite', requireAuth, writeLimiter, async (req: AuthedRequest, res) => {
    try {
      const inviteCode = await rotatePartnerInvite(req.authUser!.id);
      res.json({ inviteCode });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'SPACE_FULL') {
        res.status(400).json({ error: 'Both partner accounts are already registered.' });
        return;
      }
      res.status(500).json({ error: 'Could not generate invite code.' });
    }
  });

  // Update space customization
  router.patch('/space', requireAuth, writeLimiter, async (req: AuthedRequest, res) => {
    const parsed = updateSpaceSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid space settings.' });
      return;
    }

    try {
      const updated = await updateSpaceSettings(parsed.data);
      realtimeHub.broadcast({ type: 'space:updated', payload: updated });
      res.json({ space: updated });
    } catch {
      res.status(500).json({ error: 'Failed to update space settings.' });
    }
  });

  // Update own profile
  router.patch('/profile', requireAuth, writeLimiter, async (req: AuthedRequest, res) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data.' });
      return;
    }

    try {
      const updated = await updateUserProfile(req.authUser!.id, parsed.data);
      realtimeHub.broadcast({ type: 'user:updated', payload: updated });
      res.json({ user: updated });
    } catch {
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // List shared notes (supports server-side search, author filter, sort)
  router.get('/notes', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const authorId = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;
      const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
      const notes = await listNotes({ search, authorId, sort });
      res.json({ notes });
    } catch {
      res.status(500).json({ error: 'Failed to load shared notes.' });
    }
  });

  // Create note (authorId strictly derived from verified session)
  router.post('/notes', requireAuth, writeLimiter, async (req: AuthedRequest, res) => {
    const parsed = createNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid note payload.' });
      return;
    }

    try {
      const note = await createNote(req.authUser!.id, parsed.data);
      realtimeHub.broadcast({ type: 'note:created', payload: note });
      res.status(201).json({ note });
    } catch {
      res.status(500).json({ error: 'Failed to create note.' });
    }
  });

  // Edit own note
  router.patch('/notes/:id', requireAuth, writeLimiter, async (req: AuthedRequest, res) => {
    const parsed = updateNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid note update.' });
      return;
    }

    try {
      const note = await updateNoteByAuthor(req.params.id, req.authUser!.id, parsed.data);
      realtimeHub.broadcast({ type: 'note:updated', payload: note });
      res.json({ note });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'NOT_FOUND') {
        res.status(404).json({ error: 'Note not found.' });
        return;
      }
      if (msg === 'FORBIDDEN') {
        res.status(403).json({ error: 'You can only edit your own notes.' });
        return;
      }
      if (msg === 'ALREADY_DELETED') {
        res.status(400).json({ error: 'Deleted notes cannot be edited.' });
        return;
      }
      res.status(500).json({ error: 'Failed to update note.' });
    }
  });

  // Soft-delete own note
  router.delete('/notes/:id', requireAuth, writeLimiter, async (req: AuthedRequest, res) => {
    try {
      const note = await softDeleteNoteByAuthor(req.params.id, req.authUser!.id);
      realtimeHub.broadcast({ type: 'note:deleted', payload: note });
      res.json({ note });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'NOT_FOUND') {
        res.status(404).json({ error: 'Note not found.' });
        return;
      }
      if (msg === 'FORBIDDEN') {
        res.status(403).json({ error: 'You can only delete your own notes.' });
        return;
      }
      if (msg === 'ALREADY_DELETED') {
        res.status(400).json({ error: 'Note is already deleted.' });
        return;
      }
      res.status(500).json({ error: 'Failed to delete note.' });
    }
  });

  // Upload image(s) to Cloudinary (or confined local media fallback)
  router.post(
    '/upload',
    requireAuth,
    writeLimiter,
    upload.array('images', 4),
    async (req: AuthedRequest, res) => {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Please select at least one image to upload.' });
        return;
      }

      try {
        const uploaded = [];
        for (const file of files) {
          const item = await storeImageBuffer(file.buffer, file.mimetype);
          uploaded.push(item);
        }
        res.status(201).json({ images: uploaded });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Image upload failed.',
        });
      }
    },
  );

  // Delete pending uploaded image (before note publish)
  router.delete('/upload', requireAuth, writeLimiter, async (req: AuthedRequest, res) => {
    const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId : '';
    if (!publicId) {
      res.status(400).json({ error: 'Missing publicId.' });
      return;
    }
    try {
      await deleteStoredImage(publicId);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete uploaded image.' });
    }
  });

  // Authenticated local media serving (when Cloudinary is not configured in preview)
  router.get('/media/:filename', requireAuth, (req: AuthedRequest, res) => {
    const safePath = resolveSafeLocalMediaPath(req.params.filename);
    if (!safePath) {
      res.status(404).json({ error: 'Image not found.' });
      return;
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.sendFile(safePath);
  });

  // Server-Sent Events fallback stream for real-time sync
  router.get('/sync/stream', requireAuth, (req: AuthedRequest, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const unregister = realtimeHub.registerSse(req.authUser!.id, res);
    res.write(
      `data: ${JSON.stringify({
        type: 'presence:update',
        payload: { onlineUserIds: realtimeHub.getOnlineUserIds() },
      })}\n\n`,
    );

    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unregister();
    });
  });

  return router;
}
