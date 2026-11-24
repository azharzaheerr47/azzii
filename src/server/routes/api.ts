import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {
  changePasswordSchema,
  createComplimentSchema,
  createNoteSchema,
  loginSchema,
  redeemInviteSchema,
  setupAccountSchema,
  updateAppearanceSchema,
  updateNoteSchema,
  updateProfileSchema,
  updateSpaceSettingsSchema,
} from '../../lib/validation';
import type { PublicUser } from '../../types/index';
import {
  clearSessionCookie,
  extractAuthToken,
  isAuthSecretConfigured,
  setSessionCookie,
  signSessionToken,
  verifySessionToken,
} from '../auth/crypto';
import {
  authenticateUser,
  changeUserPassword,
  createCompliment,
  createFounderAccount,
  createNote,
  drawRandomCompliment,
  getComplimentsOverview,
  getSpaceSettings,
  getSpaceStatus,
  getUserById,
  isImagePublicIdReferenced,
  listNotes,
  listSpaceMembers,
  redeemPartnerInvite,
  rotatePartnerInvite,
  signupWithNewSpace,
  softDeleteComplimentByAuthor,
  softDeleteNoteByAuthor,
  updateNoteByAuthor,
  updateSpaceSettings,
  updateUserAppearance,
  updateUserProfile,
} from '../db/store';
import {
  deleteStoredImage,
  ImageStorageError,
  ImageUploadValidationError,
  pingCloudinary,
  resolveSafeLocalMediaPath,
  storeImageBuffer,
} from '../media/imageService';
import { DatabaseConnectionError, pingMongoDB } from '../models/mongooseModels';
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

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: 'Too many requests. Please slow down.' },
});

function asyncHandler(
  fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next);
  };
}

function respondWithServerError(
  res: Response,
  err: unknown,
  fallbackMessage: string,
  context?: { method?: string; route?: string; operation?: string },
): void {
  if (err instanceof DatabaseConnectionError) {
    console.error('[api-db-error]', {
      method: context?.method || res.req?.method,
      route: context?.route || res.req?.originalUrl || res.req?.path,
      operation: context?.operation,
      status: 503,
      code: err.code,
    });
    res.status(503).json({ error: err.message });
    return;
  }
  const safeName = err instanceof Error ? err.name : 'UnknownError';
  console.error('[api-error]', {
    method: context?.method || res.req?.method,
    route: context?.route || res.req?.originalUrl || res.req?.path,
    operation: context?.operation,
    status: 500,
    name: safeName,
  });
  res.status(500).json({ error: fallbackMessage });
}

function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const requestedWith = req.headers['x-requested-with'];
  const origin = req.headers.origin;
  const rawForwardedHost = req.headers['x-forwarded-host'];
  const forwardedHost =
    typeof rawForwardedHost === 'string'
      ? rawForwardedHost.split(',')[0].trim()
      : Array.isArray(rawForwardedHost)
        ? rawForwardedHost[0]?.split(',')[0].trim()
        : undefined;
  const host = forwardedHost || req.headers.host;

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

const requireAuth: RequestHandler = asyncHandler(async (req, res, next) => {
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
});

export function createApiRouter(): express.Router {
  const router = express.Router();

  router.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.use(verifyCsrf);

  // Health check for MongoDB Atlas & Cloudinary connectivity (no secrets exposed)
  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const [mongodb, cloudinary] = await Promise.all([pingMongoDB(), pingCloudinary()]);
      const ok =
        (!mongodb.configured || mongodb.connected) &&
        (!cloudinary.configured || cloudinary.connected) &&
        (process.env.VERCEL !== '1' || mongodb.configured);
      res.status(ok ? 200 : 503).json({
        status: ok ? 'ok' : 'error',
        application: 'Our Little Space',
        database: mongodb.connected
          ? 'connected'
          : mongodb.configured
            ? 'error'
            : 'not_configured',
        ok,
        mongodb,
        cloudinary,
        auth: { configured: isAuthSecretConfigured() },
        realtimeMode: realtimeHub.isWsAttached() ? 'ws' : 'poll',
      });
    }),
  );

  // Public space initialization status (no user details exposed)
  router.get(
    '/auth/status',
    asyncHandler(async (req, res) => {
      try {
        const token = extractAuthToken(req);
        const payload = verifySessionToken(token);
        const authedUser = payload ? await getUserById(payload.sub) : null;
        const status = await getSpaceStatus(authedUser?.spaceId);
        res.json({
          ...status,
          authenticated: Boolean(authedUser),
          realtimeMode: realtimeHub.isWsAttached() ? 'ws' : 'poll',
        });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to check space status.');
      }
    }),
  );

  // First-run Account 1 setup (legacy compatibility)
  router.post(
    '/auth/setup',
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = setupAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid setup input.' });
        return;
      }

      try {
        const { user, inviteCode } = await createFounderAccount(parsed.data);
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        res.status(201).json({ user, inviteCode, sessionToken: token });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'SPACE_ALREADY_INITIALIZED') {
          res.status(403).json({ error: 'This private space has already been initialized.' });
          return;
        }
        if (msg === 'EMAIL_EXISTS') {
          res.status(409).json({ error: 'An account with this email already exists.' });
          return;
        }
        respondWithServerError(res, err, 'Failed to create account.');
      }
    }),
  );

  // Sign up: creates Account 1 + a new private 2-person space + partner invite code
  router.post(
    '/auth/signup',
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = setupAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid sign up details.' });
        return;
      }

      try {
        const { user, inviteCode } = await signupWithNewSpace(parsed.data);
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        res.status(201).json({ user, inviteCode, sessionToken: token });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'EMAIL_EXISTS') {
          res.status(409).json({ error: 'An account with this email already exists.' });
          return;
        }
        respondWithServerError(res, err, 'Failed to create account.');
      }
    }),
  );

  // Partner 2 invite redemption (strictly enforces max 2 accounts per space)
  router.post(
    '/auth/redeem-invite',
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = redeemInviteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid invite details.' });
        return;
      }

      try {
        const user = await redeemPartnerInvite(parsed.data);
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        realtimeHub.broadcast(user.spaceId, { type: 'user:updated', payload: user });
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
        respondWithServerError(res, err, 'Unable to redeem invite code.');
      }
    }),
  );

  // Sign in
  router.post(
    '/auth/login',
    authLimiter,
    asyncHandler(async (req, res) => {
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
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        res.json({ user, sessionToken: token });
      } catch (err) {
        respondWithServerError(res, err, 'Sign in failed.');
      }
    }),
  );

  // Sign out
  router.post('/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Current authenticated user + space context
  router.get(
    '/auth/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const spaceId = req.authUser!.spaceId;
        const [members, space, status] = await Promise.all([
          listSpaceMembers(spaceId),
          getSpaceSettings(spaceId),
          getSpaceStatus(spaceId),
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
          onlineUserIds: realtimeHub.getOnlineUserIds(spaceId),
        });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to load profile.');
      }
    }),
  );

  // Rotate partner invite code (only when < 2 users in space)
  router.post(
    '/space/invite',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const inviteCode = await rotatePartnerInvite(req.authUser!.id, req.authUser!.spaceId);
        res.json({ inviteCode });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'SPACE_FULL') {
          res.status(400).json({ error: 'Both partner accounts are already registered.' });
          return;
        }
        respondWithServerError(res, err, 'Could not generate invite code.');
      }
    }),
  );

  // Update space customization
  router.patch(
    '/space',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateSpaceSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid space settings.' });
        return;
      }

      try {
        const updated = await updateSpaceSettings(req.authUser!.spaceId, parsed.data);
        realtimeHub.broadcast(req.authUser!.spaceId, { type: 'space:updated', payload: updated });
        res.json({ space: updated });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to update space settings.');
      }
    }),
  );

  // Update own profile
  router.patch(
    '/profile',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data.' });
        return;
      }

      try {
        const updated = await updateUserProfile(req.authUser!.id, parsed.data);
        realtimeHub.broadcast(req.authUser!.spaceId, { type: 'user:updated', payload: updated });
        res.json({ user: updated });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to update profile.');
      }
    }),
  );

  // Change own password (requires verifying current password)
  router.patch(
    '/profile/password',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password input.' });
        return;
      }

      try {
        await changeUserPassword(
          req.authUser!.id,
          parsed.data.currentPassword,
          parsed.data.newPassword,
        );
        res.json({ ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'INVALID_CURRENT_PASSWORD') {
          res.status(401).json({ error: 'Current password is incorrect.' });
          return;
        }
        respondWithServerError(res, err, 'Failed to update password.');
      }
    }),
  );

  // Update own personalized theme & appearance (strictly scoped to current user)
  router.patch(
    '/profile/appearance',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateAppearanceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Invalid appearance preferences.',
        });
        return;
      }

      try {
        const updated = await updateUserAppearance(req.authUser!.id, parsed.data);
        res.json({ user: updated });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to save theme preferences.');
      }
    }),
  );

  // List shared notes (supports server-side search, author filter, sort)
  router.get(
    '/notes',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const authorId = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;
        const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
        const notes = await listNotes(req.authUser!.spaceId, { search, authorId, sort });
        res.json({ notes });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to load shared notes.');
      }
    }),
  );

  // Create note (authorId strictly derived from verified session)
  router.post(
    '/notes',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = createNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid note payload.' });
        return;
      }

      try {
        const note = await createNote(req.authUser!.id, req.authUser!.spaceId, parsed.data);
        realtimeHub.broadcast(req.authUser!.spaceId, { type: 'note:created', payload: note });
        res.status(201).json({ note });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to create note.');
      }
    }),
  );

  // Edit own note
  router.patch(
    '/notes/:id',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid note update.' });
        return;
      }

      try {
        const note = await updateNoteByAuthor(
          req.params.id,
          req.authUser!.id,
          req.authUser!.spaceId,
          parsed.data,
        );
        realtimeHub.broadcast(req.authUser!.spaceId, { type: 'note:updated', payload: note });
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
        respondWithServerError(res, err, 'Failed to update note.');
      }
    }),
  );

  // Soft-delete own note
  router.delete(
    '/notes/:id',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const note = await softDeleteNoteByAuthor(
          req.params.id,
          req.authUser!.id,
          req.authUser!.spaceId,
        );
        realtimeHub.broadcast(req.authUser!.spaceId, { type: 'note:deleted', payload: note });
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
        respondWithServerError(res, err, 'Failed to delete note.');
      }
    }),
  );

  // Compliments Jar: get overview (written by user, drawn history, jar count for user)
  router.get(
    '/compliments',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const overview = await getComplimentsOverview(req.authUser!.id, req.authUser!.spaceId);
        res.json(overview);
      } catch (err) {
        respondWithServerError(res, err, 'Failed to load compliments jar.');
      }
    }),
  );

  // Compliments Jar: drop a sweet compliment for your partner
  router.post(
    '/compliments',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = createComplimentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid compliment.' });
        return;
      }

      try {
        const compliment = await createCompliment(
          req.authUser!.id,
          req.authUser!.spaceId,
          parsed.data,
        );
        realtimeHub.broadcast(req.authUser!.spaceId, {
          type: 'compliment:created',
          payload: { recipientId: compliment.recipientId, authorId: compliment.authorId },
        });
        res.status(201).json({ compliment });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to drop note into the jar.');
      }
    }),
  );

  // Compliments Jar: draw a non-repeating compliment written for the current user
  router.post(
    '/compliments/draw',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const result = await drawRandomCompliment(req.authUser!.id, req.authUser!.spaceId);
        res.status(201).json(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'EMPTY_JAR') {
          res.status(404).json({
            error: 'Your jar is waiting for a little love. Ask your partner to add a note first!',
          });
          return;
        }
        respondWithServerError(res, err, 'Failed to pick a note from the jar.');
      }
    }),
  );

  // Compliments Jar: soft-delete a compliment written by the current user
  router.delete(
    '/compliments/:id',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const deleted = await softDeleteComplimentByAuthor(
          req.params.id,
          req.authUser!.id,
          req.authUser!.spaceId,
        );
        realtimeHub.broadcast(req.authUser!.spaceId, {
          type: 'compliment:deleted',
          payload: deleted,
        });
        res.json({ ok: true, id: deleted.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'NOT_FOUND') {
          res.status(404).json({ error: 'Compliment note not found.' });
          return;
        }
        if (msg === 'FORBIDDEN') {
          res.status(403).json({ error: 'You can only remove notes you wrote yourself.' });
          return;
        }
        respondWithServerError(res, err, 'Failed to remove compliment note.');
      }
    }),
  );

  // Upload image(s) to Cloudinary (or confined local media fallback)
  router.post(
    '/upload',
    requireAuth,
    writeLimiter,
    upload.array('images', 4),
    asyncHandler(async (req, res) => {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Please select at least one image to upload.' });
        return;
      }

      try {
        const folder =
          req.query.purpose === 'theme' ? 'our-little-space/themes' : 'our-little-space/notes';
        const uploaded = [];
        for (const file of files) {
          const item = await storeImageBuffer(file.buffer, file.mimetype, folder);
          uploaded.push(item);
        }
        res.status(201).json({ images: uploaded });
      } catch (err) {
        if (err instanceof ImageUploadValidationError) {
          res.status(400).json({ error: err.message });
          return;
        }
        if (err instanceof ImageStorageError) {
          console.error('[api-upload-error]', {
            method: req.method,
            route: req.originalUrl,
            purpose: req.query.purpose === 'theme' ? 'theme' : 'notes',
            status: err.statusCode,
          });
          res.status(err.statusCode).json({ error: err.message });
          return;
        }
        respondWithServerError(res, err, 'Image upload failed.', {
          method: req.method,
          route: req.originalUrl,
          operation: 'uploadImages',
        });
      }
    }),
  );

  // Delete pending uploaded image (never delete images referenced by saved notes or user themes)
  router.delete(
    '/upload',
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId : '';
      if (!publicId) {
        res.status(400).json({ error: 'Missing publicId.' });
        return;
      }
      try {
        const inUse = await isImagePublicIdReferenced(publicId);
        if (inUse) {
          res.status(409).json({
            error: 'Image is currently in use and cannot be deleted from here.',
          });
          return;
        }
        await deleteStoredImage(publicId);
        res.json({ ok: true });
      } catch (err) {
        respondWithServerError(res, err, 'Failed to delete uploaded image.');
      }
    }),
  );

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

    const spaceId = req.authUser!.spaceId;
    const unregister = realtimeHub.registerSse(req.authUser!.id, spaceId, res);
    res.write(
      `data: ${JSON.stringify({
        type: 'presence:update',
        payload: { onlineUserIds: realtimeHub.getOnlineUserIds(spaceId) },
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

  // Return JSON 404 for unmatched API endpoints
  router.use((_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return router;
}
