// src/server/app.ts
import cookieParser from "cookie-parser";
import express2 from "express";
import multer2 from "multer";

// src/server/models/mongooseModels.ts
import mongoose, { Schema } from "mongoose";
var CustomBackgroundSubSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    position: {
      type: String,
      enum: ["center", "top", "bottom", "left", "right"],
      default: "center"
    },
    scale: { type: Number, default: 100 },
    blur: { type: Number, default: 0 },
    brightness: { type: Number, default: 95 },
    overlayOpacity: { type: Number, default: 45 },
    overlayMode: { type: String, enum: ["dark", "light"], default: "dark" }
  },
  { _id: false }
);
var AppearanceSubSchema = new Schema(
  {
    themeMode: {
      type: String,
      enum: ["system", "dark", "light", "custom"],
      default: "system"
    },
    romanticMode: { type: Boolean, default: false },
    customBackground: { type: CustomBackgroundSubSchema, default: null }
  },
  { _id: false }
);
var UserSchema = new Schema(
  {
    _id: { type: String, required: true },
    spaceId: { type: String, required: true, default: "primary-space", index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "" },
    avatarPreset: {
      type: String,
      enum: ["bat-cat", "bow-cat", "lavender", "blush", "sky"],
      default: "bat-cat"
    },
    bio: { type: String, default: "", maxlength: 160 },
    role: { type: String, enum: ["founder", "partner"], required: true },
    appearance: {
      type: AppearanceSubSchema,
      default: () => ({
        themeMode: "system",
        romanticMode: false,
        customBackground: null
      })
    },
    createdAt: { type: Date, default: () => /* @__PURE__ */ new Date() }
  },
  { versionKey: false }
);
var ImageSubSchema = new Schema(
  {
    id: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    format: { type: String, required: true },
    uploadedAt: { type: Date, default: () => /* @__PURE__ */ new Date() }
  },
  { _id: false }
);
var NoteSchema = new Schema(
  {
    _id: { type: String, required: true },
    spaceId: { type: String, required: true, default: "primary-space", index: true },
    authorId: { type: String, required: true, ref: "User" },
    content: { type: String, default: "", maxlength: 4e3 },
    tone: { type: String, enum: ["white", "lavender", "pink", "blue"], default: "white" },
    images: { type: [ImageSubSchema], default: [] },
    sticker: { type: String, default: null },
    createdAt: { type: Date, default: () => /* @__PURE__ */ new Date() },
    updatedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false }
  },
  { versionKey: false }
);
NoteSchema.index({ spaceId: 1, createdAt: -1 });
NoteSchema.index({ createdAt: -1 });
NoteSchema.index({ authorId: 1 });
NoteSchema.index({ isDeleted: 1 });
var SpaceSchema = new Schema(
  {
    _id: { type: String, required: true },
    spaceName: { type: String, default: "Our Little Space" },
    tagline: { type: String, default: "A quiet private corner for two" },
    welcomeMessage: {
      type: String,
      default: "Leave little notes, favorite moments, and snapshots for each other here."
    },
    logoStyle: {
      type: String,
      enum: ["cat-duo", "heart", "moon", "sunflower"],
      default: "cat-duo"
    },
    inviteCodeHash: { type: String, default: null, index: true },
    inviteExpiresAt: { type: Date, default: null },
    updatedAt: { type: Date, default: () => /* @__PURE__ */ new Date() }
  },
  { versionKey: false }
);
var ComplimentSchema = new Schema(
  {
    _id: { type: String, required: true },
    spaceId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, ref: "User" },
    recipientId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 500 },
    category: { type: String, default: "Just because" },
    createdAt: { type: Date, default: () => /* @__PURE__ */ new Date() },
    isDeleted: { type: Boolean, default: false }
  },
  { versionKey: false }
);
ComplimentSchema.index({ spaceId: 1, recipientId: 1, isDeleted: 1 });
ComplimentSchema.index({ spaceId: 1, authorId: 1, createdAt: -1 });
var ComplimentDrawSchema = new Schema(
  {
    _id: { type: String, required: true },
    spaceId: { type: String, required: true, index: true },
    complimentId: { type: String, required: true, ref: "Compliment" },
    recipientId: { type: String, required: true, ref: "User" },
    drawnAt: { type: Date, default: () => /* @__PURE__ */ new Date() },
    cycleNumber: { type: Number, required: true, default: 1 }
  },
  { versionKey: false }
);
ComplimentDrawSchema.index({ spaceId: 1, recipientId: 1, drawnAt: -1 });
var UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
var NoteModel = mongoose.models.Note || mongoose.model("Note", NoteSchema);
var SpaceModel = mongoose.models.Space || mongoose.model("Space", SpaceSchema);
var ComplimentModel = mongoose.models.Compliment || mongoose.model("Compliment", ComplimentSchema);
var ComplimentDrawModel = mongoose.models.ComplimentDraw || mongoose.model("ComplimentDraw", ComplimentDrawSchema);
var globalWithMongoose = globalThis;
var DatabaseConnectionError = class extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DatabaseConnectionError";
    this.code = code;
  }
};
async function connectMongoDB(uri) {
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
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5e3,
      connectTimeoutMS: 5e3
    }).catch((err) => {
      cache.conn = null;
      cache.promise = null;
      const safeName = err instanceof Error ? err.name : "MongoError";
      console.error("[mongodb] Connection failed:", safeName);
      throw new DatabaseConnectionError(
        "MONGODB_UNREACHABLE",
        "Could not connect to MongoDB Atlas. Verify MONGODB_URI and Atlas Network Access (allow 0.0.0.0/0)."
      );
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
async function pingMongoDB() {
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
      error: err instanceof DatabaseConnectionError ? err.message : "MongoDB connection failed"
    };
  }
}

// src/server/routes/api.ts
import express from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";

// src/lib/validation.ts
import { z } from "zod";
var STICKER_IDS = [
  "happy-cat",
  "sad-cat",
  "crying-cat",
  "angry-cat",
  "blushing-cat",
  "sleeping-cat",
  "love-cats",
  "hugging-cats",
  "sweet-heart",
  "sparkle-star",
  "pastel-flower",
  "pink-bow",
  "bat-cat",
  "cozy-moon",
  "sunflower",
  "tiny-stars",
  "love-letter"
];
var NOTE_TONES = ["white", "lavender", "pink", "blue"];
var AVATAR_PRESETS = ["bat-cat", "bow-cat", "lavender", "blush", "sky"];
var COMPLIMENT_CATEGORIES = [
  "Something I adore",
  "Your personality",
  "Your smile",
  "Things you do",
  "Little reminders",
  "Just because"
];
var setupAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name must be 40 characters or fewer"),
  email: z.string().trim().email("Please enter a valid email address").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  avatarPreset: z.enum(AVATAR_PRESETS).default("bat-cat"),
  spaceName: z.string().trim().min(1).max(48).optional()
});
var redeemInviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name must be 40 characters or fewer"),
  email: z.string().trim().email("Please enter a valid email address").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  inviteCode: z.string().trim().min(4, "Invite code is required").max(64),
  avatarPreset: z.enum(AVATAR_PRESETS).default("bow-cat")
});
var loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required")
});
var imageAttachmentSchema = z.object({
  id: z.string().trim().min(1).max(120),
  cloudinaryPublicId: z.string().trim().min(1).max(240),
  secureUrl: z.string().trim().min(1).max(1e3),
  width: z.number().int().positive().max(12e3),
  height: z.number().int().positive().max(12e3),
  format: z.string().trim().min(1).max(20),
  uploadedAt: z.string().trim().min(1)
});
var createNoteSchema = z.object({
  content: z.string().trim().max(4e3, "Note is too long (max 4,000 characters)").default(""),
  tone: z.enum(NOTE_TONES).default("white"),
  sticker: z.enum(STICKER_IDS).nullable().default(null),
  images: z.array(imageAttachmentSchema).max(4, "Up to 4 images per note").default([])
}).refine(
  (data) => data.content.length > 0 || data.images.length > 0 || data.sticker !== null,
  { message: "Write a note, attach an image, or pick a sticker before posting." }
);
var updateNoteSchema = z.object({
  content: z.string().trim().max(4e3, "Note is too long (max 4,000 characters)"),
  tone: z.enum(NOTE_TONES).optional(),
  sticker: z.enum(STICKER_IDS).nullable().optional(),
  images: z.array(imageAttachmentSchema).max(4).optional()
}).refine(
  (data) => data.content.length > 0 || data.images && data.images.length > 0 || data.sticker !== null && data.sticker !== void 0,
  { message: "Note cannot be completely empty." }
);
var createComplimentSchema = z.object({
  content: z.string().trim().min(2, "Write a few sweet words first.").max(500, "Keep jar notes sweet and concise (max 500 characters)."),
  category: z.enum(COMPLIMENT_CATEGORIES).default("Just because")
});
var updateSpaceSettingsSchema = z.object({
  spaceName: z.string().trim().min(1, "Space name is required").max(48),
  tagline: z.string().trim().max(100).default("Private Space for Two"),
  welcomeMessage: z.string().trim().min(1).max(240),
  logoStyle: z.enum(["cat-duo", "heart", "moon", "sunflower"]).default("cat-duo")
});
var updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  avatarPreset: z.enum(AVATAR_PRESETS),
  avatar: z.string().trim().max(1e3).optional(),
  bio: z.string().trim().max(160, "Bio must be 160 characters or fewer").optional()
});
var changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100)
});
var THEME_MODES = ["system", "dark", "light", "custom"];
var BACKGROUND_POSITIONS = ["center", "top", "bottom", "left", "right"];
var OVERLAY_MODES = ["dark", "light"];
var customBackgroundSchema = z.object({
  url: z.string().trim().min(1, "Background image URL is required").max(1e3).refine(
    (val) => val.startsWith("https://") || val.startsWith("/api/media/"),
    "Invalid background image URL."
  ),
  publicId: z.string().trim().max(240).default(""),
  position: z.enum(BACKGROUND_POSITIONS).default("center"),
  scale: z.number().min(100).max(150).default(100),
  blur: z.number().min(0).max(24).default(0),
  brightness: z.number().min(40).max(130).default(95),
  overlayOpacity: z.number().min(15).max(85).default(45),
  overlayMode: z.enum(OVERLAY_MODES).default("dark")
});
var updateAppearanceSchema = z.object({
  themeMode: z.enum(THEME_MODES),
  romanticMode: z.boolean().default(false),
  customBackground: customBackgroundSchema.nullable().default(null)
}).refine(
  (data) => data.themeMode !== "custom" || data.customBackground !== null && Boolean(data.customBackground.url),
  { message: "Upload or select a photo before activating Custom Photo theme." }
);

// src/server/auth/crypto.ts
import crypto from "node:crypto";
var SESSION_COOKIE_NAME = "ols_session";
var SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
var ephemeralSecret = null;
var warnedMissingAuthSecret = false;
function isAuthSecretConfigured() {
  const configured = process.env.AUTH_SECRET?.trim();
  return Boolean(configured && configured.length >= 16);
}
function getAuthSecret() {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return configured;
  }
  if (process.env.VERCEL === "1" && !warnedMissingAuthSecret) {
    warnedMissingAuthSecret = true;
    console.warn(
      "[auth-config] AUTH_SECRET is missing or shorter than 16 characters; sessions will reset across serverless cold starts."
    );
  }
  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(32).toString("hex");
  }
  return ephemeralSecret;
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, storedHash) {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
function hashInviteCode(code) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[bytes[i] % chars.length];
    if (i === 3) out += "-";
  }
  return out;
}
function signSessionToken(userId, role, spaceId = "primary-space") {
  const payload = {
    sub: userId,
    role,
    spaceId,
    exp: Math.floor(Date.now() / 1e3) + SESSION_TTL_SECONDS
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}
function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed.sub || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1e3)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function isSecureRequest(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    if (forwardedProto.split(",")[0].trim().toLowerCase() === "https") return true;
  } else if (Array.isArray(forwardedProto) && forwardedProto[0]?.toLowerCase().includes("https")) {
    return true;
  }
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.startsWith("https://")) {
    return true;
  }
  return req.secure || req.protocol === "https";
}
function setSessionCookie(req, res, token) {
  const isHttps = isSecureRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`
  ];
  if (isHttps) {
    parts.push("Secure", "SameSite=None", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}
function clearSessionCookie(req, res) {
  const isHttps = isSecureRequest(req);
  const parts = [`${SESSION_COOKIE_NAME}=`, "HttpOnly", "Path=/", "Max-Age=0"];
  if (isHttps) {
    parts.push("Secure", "SameSite=None", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}
function parseCookieToken(cookieHeader) {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === SESSION_COOKIE_NAME) {
      const raw = pair.slice(idx + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return null;
      }
    }
  }
  return null;
}
function extractAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  return parseCookieToken(req.headers.cookie);
}

// src/server/db/store.ts
import crypto3 from "node:crypto";
import fs2 from "node:fs";
import os2 from "node:os";
import path2 from "node:path";

// src/lib/complimentLogic.ts
function selectNextCompliment(allComplimentsForRecipient, currentCycleDraws, randomFn = Math.random, lastDrawnId) {
  const active = allComplimentsForRecipient.filter((c) => !c.isDeleted);
  if (active.length === 0) {
    return {
      selected: null,
      cycleReset: false,
      nextCycleNumber: 1,
      remainingInCycleAfterDraw: 0
    };
  }
  const maxCycle = currentCycleDraws.reduce(
    (max, d) => d.cycleNumber > max ? d.cycleNumber : max,
    1
  );
  const drawnIdsInCurrentCycle = new Set(
    currentCycleDraws.filter((d) => d.cycleNumber === maxCycle).map((d) => d.complimentId)
  );
  let pool = active.filter((c) => !drawnIdsInCurrentCycle.has(c.id));
  let cycleReset = false;
  let nextCycleNumber = maxCycle;
  if (pool.length === 0) {
    cycleReset = currentCycleDraws.length > 0;
    nextCycleNumber = currentCycleDraws.length > 0 ? maxCycle + 1 : 1;
    pool = active.length > 1 && lastDrawnId ? active.filter((c) => c.id !== lastDrawnId) : [...active];
  }
  const rawIndex = Math.floor(Math.max(0, Math.min(0.999999999, randomFn())) * pool.length);
  const selected = pool[rawIndex] ?? pool[0];
  const remainingInCycleAfterDraw = cycleReset ? Math.max(0, active.length - 1) : Math.max(0, pool.length - 1);
  return {
    selected,
    cycleReset,
    nextCycleNumber,
    remainingInCycleAfterDraw
  };
}

// src/lib/themeLogic.ts
var DEFAULT_CUSTOM_BACKGROUND_SETTINGS = {
  position: "center",
  scale: 100,
  blur: 0,
  brightness: 95,
  overlayOpacity: 45,
  overlayMode: "dark"
};
var DEFAULT_USER_APPEARANCE = {
  themeMode: "system",
  romanticMode: false,
  customBackground: null
};
function clampNumber(value, min, max, fallback) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}
function normalizeCustomBackground(raw) {
  if (!raw || typeof raw.url !== "string" || !raw.url.trim()) {
    return null;
  }
  const position = raw.position === "top" || raw.position === "bottom" || raw.position === "left" || raw.position === "right" ? raw.position : "center";
  const overlayMode = raw.overlayMode === "light" ? "light" : "dark";
  return {
    url: raw.url.trim(),
    publicId: typeof raw.publicId === "string" ? raw.publicId.trim() : "",
    position,
    scale: clampNumber(raw.scale, 100, 150, DEFAULT_CUSTOM_BACKGROUND_SETTINGS.scale),
    blur: clampNumber(raw.blur, 0, 24, DEFAULT_CUSTOM_BACKGROUND_SETTINGS.blur),
    brightness: clampNumber(
      raw.brightness,
      40,
      130,
      DEFAULT_CUSTOM_BACKGROUND_SETTINGS.brightness
    ),
    overlayOpacity: clampNumber(
      raw.overlayOpacity,
      15,
      85,
      DEFAULT_CUSTOM_BACKGROUND_SETTINGS.overlayOpacity
    ),
    overlayMode
  };
}
function normalizeAppearance(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_USER_APPEARANCE, customBackground: null };
  }
  const themeMode = raw.themeMode === "dark" || raw.themeMode === "light" || raw.themeMode === "custom" || raw.themeMode === "system" ? raw.themeMode : "system";
  const customBackground = normalizeCustomBackground(raw.customBackground);
  return {
    themeMode: themeMode === "custom" && !customBackground ? "system" : themeMode,
    romanticMode: Boolean(raw.romanticMode),
    customBackground
  };
}

// src/server/media/imageService.ts
import crypto2 from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
var ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var LOCAL_MEDIA_DIR = process.env.VERCEL === "1" ? path.resolve(os.tmpdir(), ".data", "media") : path.resolve(process.cwd(), ".data", "media");
function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() && process.env.CLOUDINARY_API_KEY?.trim() && process.env.CLOUDINARY_API_SECRET?.trim()
  );
}
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}
function detectImageFormatFromMagicBytes(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) {
    return "jpeg";
  }
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71 && buf[4] === 13 && buf[5] === 10 && buf[6] === 26 && buf[7] === 10) {
    return "png";
  }
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  return null;
}
function parseImageDimensions(buf, format) {
  try {
    if (format === "png" && buf.length >= 24) {
      return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20)
      };
    }
    if (format === "jpeg") {
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 255) break;
        const marker = buf[offset + 1];
        const segLen = buf.readUInt16BE(offset + 2);
        if (marker === 192 || marker === 193 || marker === 194 || marker === 195) {
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7)
          };
        }
        if (segLen < 2) break;
        offset += 2 + segLen;
      }
    }
    if (format === "webp" && buf.length >= 30) {
      const chunk = buf.subarray(12, 16).toString("ascii");
      if (chunk === "VP8X") {
        const w = 1 + (buf[24] | buf[25] << 8 | buf[26] << 16);
        const h = 1 + (buf[27] | buf[28] << 8 | buf[29] << 16);
        return { width: w, height: h };
      }
    }
  } catch {
  }
  return { width: 1200, height: 900 };
}
function validateUploadedImage(buffer, mimetype) {
  if (!ALLOWED_MIME_TYPES.has(mimetype.toLowerCase())) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed.");
  }
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image size must be between 1 byte and 5 MB.");
  }
  const detected = detectImageFormatFromMagicBytes(buffer);
  if (!detected) {
    throw new Error("Invalid image file contents. Please upload a real JPEG, PNG, or WebP file.");
  }
  const dims = parseImageDimensions(buffer, detected);
  return {
    format: detected,
    width: Math.max(1, dims.width),
    height: Math.max(1, dims.height)
  };
}
async function storeImageBuffer(buffer, mimetype, folder = "our-little-space/notes") {
  const { format, width, height } = validateUploadedImage(buffer, mimetype);
  const id = crypto2.randomUUID();
  const uploadedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (isCloudinaryConfigured()) {
    configureCloudinary();
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"]
        },
        (error, res) => {
          if (error || !res) {
            reject(error || new Error("Cloudinary upload failed"));
            return;
          }
          resolve(res);
        }
      );
      stream.end(buffer);
    });
    return {
      id,
      cloudinaryPublicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width || width,
      height: result.height || height,
      format: result.format || format,
      uploadedAt
    };
  }
  fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
  const filename = `${id}.${format}`;
  const targetPath = path.resolve(LOCAL_MEDIA_DIR, filename);
  if (!targetPath.startsWith(LOCAL_MEDIA_DIR + path.sep)) {
    throw new Error("Invalid media path");
  }
  fs.writeFileSync(targetPath, buffer);
  return {
    id,
    cloudinaryPublicId: `local/${filename}`,
    secureUrl: `/api/media/${filename}`,
    width,
    height,
    format,
    uploadedAt
  };
}
async function deleteStoredImage(publicId) {
  if (!publicId) return;
  if (publicId.startsWith("local/")) {
    const safeFilename = path.basename(publicId.slice("local/".length));
    const targetPath = path.resolve(LOCAL_MEDIA_DIR, safeFilename);
    if (targetPath.startsWith(LOCAL_MEDIA_DIR + path.sep) && fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return;
  }
  if (isCloudinaryConfigured()) {
    configureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" }).catch(() => void 0);
  }
}
function resolveSafeLocalMediaPath(filename) {
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
async function pingCloudinary() {
  if (!isCloudinaryConfigured()) {
    return { configured: false, connected: false };
  }
  try {
    configureCloudinary();
    const res = await cloudinary.api.ping();
    return { configured: true, connected: res?.status === "ok" };
  } catch (err) {
    const msg = err?.error?.message || (err instanceof Error ? err.message : "Cloudinary ping failed");
    return {
      configured: true,
      connected: false,
      error: msg
    };
  }
}

// src/server/db/store.ts
var PENDING_PARTNER_ID = "pending-partner";
var DATA_DIR = process.env.VERCEL === "1" ? path2.resolve(os2.tmpdir(), ".data") : path2.resolve(process.cwd(), ".data");
var LOCAL_DB_PATH = path2.resolve(DATA_DIR, "space-db.json");
var DEFAULT_SPACE_ID = "primary-space";
function defaultSpace(spaceName = "Our Little Space") {
  return {
    spaceName,
    tagline: "A quiet private corner for two",
    welcomeMessage: "Leave little notes, favorite moments, and snapshots for each other here.",
    logoStyle: "cat-duo",
    inviteCodeHash: null,
    inviteExpiresAt: null,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function normalizeLocalSnapshot(raw) {
  const spaces = { ...raw.spaces || {} };
  if (raw.space && !spaces[DEFAULT_SPACE_ID]) {
    spaces[DEFAULT_SPACE_ID] = raw.space;
  }
  if (!spaces[DEFAULT_SPACE_ID]) {
    spaces[DEFAULT_SPACE_ID] = defaultSpace();
  }
  const users = (raw.users || []).map((u) => ({
    ...u,
    spaceId: u.spaceId || DEFAULT_SPACE_ID
  }));
  const notes = (raw.notes || []).map((n) => ({
    ...n,
    spaceId: n.spaceId || DEFAULT_SPACE_ID
  }));
  const compliments = (raw.compliments || []).map((c) => ({
    ...c,
    spaceId: c.spaceId || DEFAULT_SPACE_ID
  }));
  const complimentDraws = (raw.complimentDraws || []).map((d) => ({
    ...d,
    spaceId: d.spaceId || DEFAULT_SPACE_ID
  }));
  return { users, notes, compliments, complimentDraws, spaces };
}
function readLocalDb() {
  fs2.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs2.existsSync(LOCAL_DB_PATH)) {
    const initial = {
      users: [],
      notes: [],
      compliments: [],
      complimentDraws: [],
      spaces: { [DEFAULT_SPACE_ID]: defaultSpace() }
    };
    writeLocalDb(initial);
    return initial;
  }
  const raw = JSON.parse(fs2.readFileSync(LOCAL_DB_PATH, "utf8"));
  return normalizeLocalSnapshot(raw);
}
function writeLocalDb(snapshot) {
  fs2.mkdirSync(DATA_DIR, { recursive: true });
  const tempPath = `${LOCAL_DB_PATH}.${process.pid}.tmp`;
  fs2.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
  fs2.renameSync(tempPath, LOCAL_DB_PATH);
}
function toPublicUser(u) {
  return {
    id: u.id,
    spaceId: u.spaceId || DEFAULT_SPACE_ID,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    avatarPreset: u.avatarPreset,
    bio: u.bio || "",
    role: u.role,
    appearance: normalizeAppearance(u.appearance),
    createdAt: u.createdAt
  };
}
function mongoUserToRecord(doc) {
  return {
    id: doc._id,
    spaceId: doc.spaceId || DEFAULT_SPACE_ID,
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    avatar: doc.avatar,
    avatarPreset: doc.avatarPreset,
    bio: doc.bio || "",
    role: doc.role,
    appearance: normalizeAppearance(doc.appearance),
    createdAt: doc.createdAt.toISOString()
  };
}
function mongoNoteToRecord(doc) {
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
      uploadedAt: img.uploadedAt.toISOString()
    })),
    sticker: doc.sticker,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
    isDeleted: doc.isDeleted
  };
}
function hydrateNote(note, usersMap) {
  const author = usersMap.get(note.authorId);
  return {
    id: note.id,
    authorId: note.authorId,
    authorName: author?.name ?? "Partner",
    authorAvatar: author?.avatar ?? "",
    authorAvatarPreset: author?.avatarPreset ?? "bat-cat",
    content: note.isDeleted ? "" : note.content,
    tone: note.tone,
    images: note.isDeleted ? [] : note.images,
    sticker: note.isDeleted ? null : note.sticker,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    deletedAt: note.deletedAt,
    isDeleted: note.isDeleted
  };
}
function mongoSpaceFilter(spaceId) {
  if (spaceId === DEFAULT_SPACE_ID) {
    return { $or: [{ spaceId: DEFAULT_SPACE_ID }, { spaceId: { $exists: false } }] };
  }
  return { spaceId };
}
function isMongoDuplicateKeyError(err) {
  return Boolean(
    err && typeof err === "object" && "code" in err && err.code === 11e3
  );
}
async function useMongo() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    if (process.env.VERCEL === "1") {
      throw new DatabaseConnectionError(
        "MONGODB_NOT_CONFIGURED",
        "MONGODB_URI is not set in Vercel Environment Variables."
      );
    }
    return false;
  }
  await connectMongoDB(uri);
  return true;
}
async function getSpaceStatus(spaceId) {
  const mongo = await useMongo();
  if (mongo) {
    if (spaceId) {
      const [userCount, space] = await Promise.all([
        UserModel.countDocuments(mongoSpaceFilter(spaceId)),
        SpaceModel.findById(spaceId).lean()
      ]);
      const hasOpenInvite2 = Boolean(
        userCount < 2 && space?.inviteCodeHash && space.inviteExpiresAt && new Date(space.inviteExpiresAt).getTime() > Date.now()
      );
      return {
        initialized: true,
        userCount,
        maxUsers: 2,
        hasOpenInvite: hasOpenInvite2,
        storageMode: "mongodb",
        mediaMode: isCloudinaryConfigured() ? "cloudinary" : "local"
      };
    }
    const totalUsers2 = await UserModel.countDocuments();
    const defaultUserCount2 = totalUsers2 > 0 ? await UserModel.countDocuments(mongoSpaceFilter(DEFAULT_SPACE_ID)) : 0;
    const openSpaceInvite = await SpaceModel.findOne({
      inviteCodeHash: { $ne: null },
      inviteExpiresAt: { $gt: /* @__PURE__ */ new Date() }
    }).select({ _id: 1 }).lean();
    return {
      initialized: totalUsers2 > 0,
      userCount: Math.min(defaultUserCount2, 2),
      maxUsers: 2,
      hasOpenInvite: Boolean(openSpaceInvite),
      storageMode: "mongodb",
      mediaMode: isCloudinaryConfigured() ? "cloudinary" : "local"
    };
  }
  const db = readLocalDb();
  if (spaceId) {
    const userCount = db.users.filter((u) => u.spaceId === spaceId).length;
    const space = db.spaces[spaceId];
    const hasOpenInvite2 = Boolean(
      userCount < 2 && space?.inviteCodeHash && space.inviteExpiresAt && new Date(space.inviteExpiresAt).getTime() > Date.now()
    );
    return {
      initialized: true,
      userCount,
      maxUsers: 2,
      hasOpenInvite: hasOpenInvite2,
      storageMode: "local",
      mediaMode: isCloudinaryConfigured() ? "cloudinary" : "local"
    };
  }
  const totalUsers = db.users.length;
  const defaultUserCount = db.users.filter((u) => u.spaceId === DEFAULT_SPACE_ID).length;
  const hasOpenInvite = Object.values(db.spaces).some(
    (s) => Boolean(s.inviteCodeHash) && Boolean(s.inviteExpiresAt) && new Date(s.inviteExpiresAt).getTime() > Date.now()
  );
  return {
    initialized: totalUsers > 0,
    userCount: Math.min(defaultUserCount, 2),
    maxUsers: 2,
    hasOpenInvite,
    storageMode: "local",
    mediaMode: isCloudinaryConfigured() ? "cloudinary" : "local"
  };
}
async function createFounderAccount(input) {
  const mongo = await useMongo();
  if (mongo) {
    const count = await UserModel.countDocuments();
    if (count > 0) {
      throw new Error("SPACE_ALREADY_INITIALIZED");
    }
  } else {
    const db = readLocalDb();
    if (db.users.length > 0) {
      throw new Error("SPACE_ALREADY_INITIALIZED");
    }
  }
  return signupWithNewSpace(input);
}
async function signupWithNewSpace(input) {
  const email = input.email.trim().toLowerCase();
  const displayName = input.name.trim();
  const spaceName = input.spaceName?.trim() || "Our Little Space";
  const passwordHash = hashPassword(input.password);
  const inviteCode = generateInviteCode();
  const inviteHash = hashInviteCode(inviteCode);
  const inviteExpires = new Date(Date.now() + 1e3 * 60 * 60 * 24 * 7);
  const userId = crypto3.randomUUID();
  const now = /* @__PURE__ */ new Date();
  const mongo = await useMongo();
  if (mongo) {
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }
    const totalUsers = await UserModel.countDocuments();
    const spaceId2 = totalUsers === 0 ? DEFAULT_SPACE_ID : crypto3.randomUUID();
    try {
      const created = await UserModel.create({
        _id: userId,
        spaceId: spaceId2,
        name: displayName,
        email,
        passwordHash,
        avatar: "",
        avatarPreset: input.avatarPreset,
        role: "founder",
        appearance: DEFAULT_USER_APPEARANCE,
        createdAt: now
      });
      await SpaceModel.findByIdAndUpdate(
        spaceId2,
        {
          $setOnInsert: {
            _id: spaceId2,
            tagline: "A quiet private corner for two",
            welcomeMessage: "Leave little notes, favorite moments, and snapshots for each other here.",
            logoStyle: "cat-duo"
          },
          $set: {
            spaceName,
            inviteCodeHash: inviteHash,
            inviteExpiresAt: inviteExpires,
            updatedAt: now
          }
        },
        { upsert: true }
      );
      return { user: toPublicUser(mongoUserToRecord(created)), inviteCode };
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        throw new Error("EMAIL_EXISTS");
      }
      throw err;
    }
  }
  const db = readLocalDb();
  if (db.users.some((u) => u.email === email)) {
    throw new Error("EMAIL_EXISTS");
  }
  const spaceId = db.users.length === 0 ? DEFAULT_SPACE_ID : crypto3.randomUUID();
  const newUser = {
    id: userId,
    spaceId,
    name: displayName,
    email,
    passwordHash,
    avatar: "",
    avatarPreset: input.avatarPreset,
    role: "founder",
    appearance: DEFAULT_USER_APPEARANCE,
    createdAt: now.toISOString()
  };
  db.users.push(newUser);
  const existingSpace = db.spaces[spaceId] ?? defaultSpace(spaceName);
  db.spaces[spaceId] = {
    ...existingSpace,
    spaceName,
    inviteCodeHash: inviteHash,
    inviteExpiresAt: inviteExpires.toISOString(),
    updatedAt: now.toISOString()
  };
  writeLocalDb(db);
  return { user: toPublicUser(newUser), inviteCode };
}
async function redeemPartnerInvite(input) {
  const email = input.email.trim().toLowerCase();
  const providedHash = hashInviteCode(input.inviteCode);
  const passwordHash = hashPassword(input.password);
  const userId = crypto3.randomUUID();
  const now = /* @__PURE__ */ new Date();
  const mongo = await useMongo();
  if (mongo) {
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }
    const space = await SpaceModel.findOne({ inviteCodeHash: providedHash });
    if (!space || !space.inviteCodeHash || !space.inviteExpiresAt || space.inviteExpiresAt.getTime() < Date.now() || !crypto3.timingSafeEqual(Buffer.from(space.inviteCodeHash), Buffer.from(providedHash))) {
      throw new Error("INVALID_INVITE");
    }
    const spaceUsersCount2 = await UserModel.countDocuments(mongoSpaceFilter(space._id));
    if (spaceUsersCount2 >= 2) {
      throw new Error("SPACE_FULL");
    }
    try {
      const created = await UserModel.create({
        _id: userId,
        spaceId: space._id,
        name: input.name.trim(),
        email,
        passwordHash,
        avatar: "",
        avatarPreset: input.avatarPreset,
        role: "partner",
        appearance: DEFAULT_USER_APPEARANCE,
        createdAt: now
      });
      await ComplimentModel.updateMany(
        { spaceId: space._id, recipientId: PENDING_PARTNER_ID },
        { $set: { recipientId: userId } }
      );
      space.inviteCodeHash = null;
      space.inviteExpiresAt = null;
      space.updatedAt = now;
      await space.save();
      return toPublicUser(mongoUserToRecord(created));
    } catch (err) {
      if (isMongoDuplicateKeyError(err)) {
        throw new Error("EMAIL_EXISTS");
      }
      throw err;
    }
  }
  const db = readLocalDb();
  if (db.users.some((u) => u.email === email)) {
    throw new Error("EMAIL_EXISTS");
  }
  let matchedSpaceId = null;
  for (const [candidateSpaceId, candidateSpace] of Object.entries(db.spaces)) {
    if (candidateSpace.inviteCodeHash && candidateSpace.inviteCodeHash.length === providedHash.length && crypto3.timingSafeEqual(Buffer.from(candidateSpace.inviteCodeHash), Buffer.from(providedHash))) {
      if (candidateSpace.inviteExpiresAt && new Date(candidateSpace.inviteExpiresAt).getTime() >= Date.now()) {
        matchedSpaceId = candidateSpaceId;
        break;
      }
    }
  }
  if (!matchedSpaceId) {
    throw new Error("INVALID_INVITE");
  }
  const spaceUsersCount = db.users.filter((u) => u.spaceId === matchedSpaceId).length;
  if (spaceUsersCount >= 2) {
    throw new Error("SPACE_FULL");
  }
  const newUser = {
    id: userId,
    spaceId: matchedSpaceId,
    name: input.name.trim(),
    email,
    passwordHash,
    avatar: "",
    avatarPreset: input.avatarPreset,
    bio: "",
    role: "partner",
    appearance: DEFAULT_USER_APPEARANCE,
    createdAt: now.toISOString()
  };
  db.users.push(newUser);
  db.compliments = db.compliments.map(
    (c) => c.spaceId === matchedSpaceId && c.recipientId === PENDING_PARTNER_ID ? { ...c, recipientId: userId } : c
  );
  db.spaces[matchedSpaceId] = {
    ...db.spaces[matchedSpaceId],
    inviteCodeHash: null,
    inviteExpiresAt: null,
    updatedAt: now.toISOString()
  };
  writeLocalDb(db);
  return toPublicUser(newUser);
}
async function rotatePartnerInvite(requesterId, spaceId) {
  const inviteCode = generateInviteCode();
  const inviteHash = hashInviteCode(inviteCode);
  const inviteExpires = new Date(Date.now() + 1e3 * 60 * 60 * 24 * 7);
  const mongo = await useMongo();
  if (mongo) {
    const user2 = await UserModel.findById(requesterId);
    if (!user2 || (user2.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error("UNAUTHORIZED");
    }
    const count = await UserModel.countDocuments(mongoSpaceFilter(spaceId));
    if (count >= 2) throw new Error("SPACE_FULL");
    await SpaceModel.findByIdAndUpdate(
      spaceId,
      {
        $set: {
          inviteCodeHash: inviteHash,
          inviteExpiresAt: inviteExpires,
          updatedAt: /* @__PURE__ */ new Date()
        }
      },
      { upsert: true }
    );
    return inviteCode;
  }
  const db = readLocalDb();
  const user = db.users.find((u) => u.id === requesterId);
  if (!user || user.spaceId !== spaceId) throw new Error("UNAUTHORIZED");
  if (db.users.filter((u) => u.spaceId === spaceId).length >= 2) throw new Error("SPACE_FULL");
  db.spaces[spaceId] = {
    ...db.spaces[spaceId] ?? defaultSpace(),
    inviteCodeHash: inviteHash,
    inviteExpiresAt: inviteExpires.toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeLocalDb(db);
  return inviteCode;
}
async function authenticateUser(email, password) {
  const normalized = email.trim().toLowerCase();
  const mongo = await useMongo();
  if (mongo) {
    const user2 = await UserModel.findOne({ email: normalized });
    if (!user2) return null;
    if (!verifyPassword(password, user2.passwordHash)) return null;
    return toPublicUser(mongoUserToRecord(user2));
  }
  const db = readLocalDb();
  const user = db.users.find((u) => u.email === normalized);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}
async function getUserById(userId) {
  const mongo = await useMongo();
  if (mongo) {
    const user2 = await UserModel.findById(userId);
    return user2 ? toPublicUser(mongoUserToRecord(user2)) : null;
  }
  const db = readLocalDb();
  const user = db.users.find((u) => u.id === userId);
  return user ? toPublicUser(user) : null;
}
async function listSpaceMembers(spaceId) {
  const mongo = await useMongo();
  if (mongo) {
    const users = await UserModel.find(mongoSpaceFilter(spaceId)).sort({ createdAt: 1 });
    return users.map((u) => toPublicUser(mongoUserToRecord(u)));
  }
  const db = readLocalDb();
  return db.users.filter((u) => u.spaceId === spaceId).map(toPublicUser);
}
async function updateUserProfile(userId, input) {
  const mongo = await useMongo();
  if (mongo) {
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          name: input.name.trim(),
          avatarPreset: input.avatarPreset,
          ...input.avatar !== void 0 ? { avatar: input.avatar } : {},
          ...input.bio !== void 0 ? { bio: input.bio.trim() } : {}
        }
      },
      { new: true }
    );
    if (!updated) throw new Error("NOT_FOUND");
    return toPublicUser(mongoUserToRecord(updated));
  }
  const db = readLocalDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("NOT_FOUND");
  db.users[idx] = {
    ...db.users[idx],
    name: input.name.trim(),
    avatarPreset: input.avatarPreset,
    ...input.avatar !== void 0 ? { avatar: input.avatar } : {},
    ...input.bio !== void 0 ? { bio: input.bio.trim() } : {}
  };
  writeLocalDb(db);
  return toPublicUser(db.users[idx]);
}
async function changeUserPassword(userId, currentPassword, newPassword) {
  const mongo = await useMongo();
  if (mongo) {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error("NOT_FOUND");
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error("INVALID_CURRENT_PASSWORD");
    }
    user.passwordHash = hashPassword(newPassword);
    await user.save();
    return;
  }
  const db = readLocalDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("NOT_FOUND");
  if (!verifyPassword(currentPassword, db.users[idx].passwordHash)) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }
  db.users[idx].passwordHash = hashPassword(newPassword);
  writeLocalDb(db);
}
async function isImagePublicIdReferenced(publicId, ignoreUserId) {
  if (!publicId) return false;
  const mongo = await useMongo();
  if (mongo) {
    const [noteRef, userRef] = await Promise.all([
      NoteModel.exists({ "images.cloudinaryPublicId": publicId, isDeleted: false }),
      UserModel.exists({
        ...ignoreUserId ? { _id: { $ne: ignoreUserId } } : {},
        "appearance.customBackground.publicId": publicId
      })
    ]);
    return Boolean(noteRef || userRef);
  }
  const db = readLocalDb();
  const inNotes = db.notes.some(
    (n) => !n.isDeleted && n.images.some((img) => img.cloudinaryPublicId === publicId)
  );
  if (inNotes) return true;
  return db.users.some(
    (u) => u.id !== ignoreUserId && u.appearance?.customBackground?.publicId === publicId
  );
}
async function updateUserAppearance(userId, rawAppearance) {
  const nextAppearance = normalizeAppearance(rawAppearance);
  const mongo = await useMongo();
  if (mongo) {
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) throw new Error("NOT_FOUND");
    const prevPublicId2 = currentUser.appearance?.customBackground?.publicId || "";
    const nextPublicId2 = nextAppearance.customBackground?.publicId || "";
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { appearance: nextAppearance } },
      { new: true }
    );
    if (!updated) throw new Error("NOT_FOUND");
    if (prevPublicId2 && prevPublicId2 !== nextPublicId2) {
      const stillReferenced = await isImagePublicIdReferenced(prevPublicId2, userId);
      if (!stillReferenced) {
        await deleteStoredImage(prevPublicId2);
      }
    }
    return toPublicUser(mongoUserToRecord(updated));
  }
  const db = readLocalDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("NOT_FOUND");
  const prevPublicId = db.users[idx].appearance?.customBackground?.publicId || "";
  const nextPublicId = nextAppearance.customBackground?.publicId || "";
  db.users[idx] = {
    ...db.users[idx],
    appearance: nextAppearance
  };
  writeLocalDb(db);
  if (prevPublicId && prevPublicId !== nextPublicId) {
    const stillReferenced = await isImagePublicIdReferenced(prevPublicId, userId);
    if (!stillReferenced) {
      await deleteStoredImage(prevPublicId);
    }
  }
  return toPublicUser(db.users[idx]);
}
async function getSpaceSettings(spaceId) {
  const mongo = await useMongo();
  if (mongo) {
    let space2 = await SpaceModel.findById(spaceId);
    if (!space2) {
      space2 = await SpaceModel.create({ _id: spaceId });
    }
    return {
      spaceName: space2.spaceName,
      tagline: space2.tagline,
      welcomeMessage: space2.welcomeMessage,
      logoStyle: space2.logoStyle,
      updatedAt: space2.updatedAt.toISOString()
    };
  }
  const db = readLocalDb();
  const space = db.spaces[spaceId] ?? defaultSpace();
  return {
    spaceName: space.spaceName,
    tagline: space.tagline,
    welcomeMessage: space.welcomeMessage,
    logoStyle: space.logoStyle,
    updatedAt: space.updatedAt
  };
}
async function updateSpaceSettings(spaceId, input) {
  const now = /* @__PURE__ */ new Date();
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
          updatedAt: now
        }
      },
      { new: true, upsert: true }
    );
    return {
      spaceName: space.spaceName,
      tagline: space.tagline,
      welcomeMessage: space.welcomeMessage,
      logoStyle: space.logoStyle,
      updatedAt: space.updatedAt.toISOString()
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
    updatedAt: now.toISOString()
  };
  writeLocalDb(db);
  return {
    spaceName: db.spaces[spaceId].spaceName,
    tagline: db.spaces[spaceId].tagline,
    welcomeMessage: db.spaces[spaceId].welcomeMessage,
    logoStyle: db.spaces[spaceId].logoStyle,
    updatedAt: db.spaces[spaceId].updatedAt
  };
}
async function listNotes(spaceId, options) {
  const mongo = await useMongo();
  let usersMap;
  let noteRecords;
  if (mongo) {
    const [users, notes] = await Promise.all([
      UserModel.find(mongoSpaceFilter(spaceId)),
      NoteModel.find(mongoSpaceFilter(spaceId)).sort({
        createdAt: options?.sort === "oldest" ? 1 : -1
      })
    ]);
    usersMap = new Map(users.map((u) => [u._id, mongoUserToRecord(u)]));
    noteRecords = notes.map(mongoNoteToRecord);
  } else {
    const db = readLocalDb();
    usersMap = new Map(db.users.filter((u) => u.spaceId === spaceId).map((u) => [u.id, u]));
    noteRecords = db.notes.filter((n) => n.spaceId === spaceId).sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return options?.sort === "oldest" ? ta - tb : tb - ta;
    });
  }
  let hydrated = noteRecords.map((n) => hydrateNote(n, usersMap));
  if (options?.authorId && options.authorId !== "all") {
    hydrated = hydrated.filter((n) => n.authorId === options.authorId);
  }
  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    hydrated = hydrated.filter(
      (n) => !n.isDeleted && (n.content.toLowerCase().includes(q) || n.authorName.toLowerCase().includes(q) || (n.sticker ?? "").toLowerCase().includes(q))
    );
  }
  return hydrated;
}
async function createNote(authorId, spaceId, input) {
  const noteId = crypto3.randomUUID();
  const now = /* @__PURE__ */ new Date();
  const mongo = await useMongo();
  if (mongo) {
    const author2 = await UserModel.findById(authorId);
    if (!author2 || (author2.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error("UNAUTHORIZED");
    }
    const created = await NoteModel.create({
      _id: noteId,
      spaceId,
      authorId,
      content: input.content.trim(),
      tone: input.tone,
      images: input.images.map((img) => ({
        ...img,
        uploadedAt: new Date(img.uploadedAt)
      })),
      sticker: input.sticker,
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
      isDeleted: false
    });
    const usersMap = /* @__PURE__ */ new Map([[author2._id, mongoUserToRecord(author2)]]);
    return hydrateNote(mongoNoteToRecord(created), usersMap);
  }
  const db = readLocalDb();
  const author = db.users.find((u) => u.id === authorId && u.spaceId === spaceId);
  if (!author) throw new Error("UNAUTHORIZED");
  const record = {
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
    isDeleted: false
  };
  db.notes.unshift(record);
  writeLocalDb(db);
  return hydrateNote(record, /* @__PURE__ */ new Map([[author.id, author]]));
}
async function updateNoteByAuthor(noteId, requesterId, spaceId, input) {
  const now = /* @__PURE__ */ new Date();
  const mongo = await useMongo();
  if (mongo) {
    const existing2 = await NoteModel.findById(noteId);
    if (!existing2 || (existing2.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error("NOT_FOUND");
    }
    if (existing2.authorId !== requesterId) throw new Error("FORBIDDEN");
    if (existing2.isDeleted) throw new Error("ALREADY_DELETED");
    const previousPublicIds = existing2.images.map((i) => i.cloudinaryPublicId);
    const nextImages = input.images ?? existing2.images;
    const nextPublicIds = new Set(nextImages.map((i) => i.cloudinaryPublicId));
    for (const oldId of previousPublicIds) {
      if (!nextPublicIds.has(oldId)) {
        await deleteStoredImage(oldId);
      }
    }
    existing2.content = input.content.trim();
    if (input.tone !== void 0) existing2.tone = input.tone;
    if (input.sticker !== void 0) existing2.sticker = input.sticker;
    if (input.images !== void 0) {
      existing2.images = input.images.map((img) => ({
        ...img,
        uploadedAt: new Date(img.uploadedAt)
      }));
    }
    existing2.updatedAt = now;
    await existing2.save();
    const author = await UserModel.findById(existing2.authorId);
    const usersMap2 = author ? /* @__PURE__ */ new Map([[author._id, mongoUserToRecord(author)]]) : /* @__PURE__ */ new Map();
    return hydrateNote(mongoNoteToRecord(existing2), usersMap2);
  }
  const db = readLocalDb();
  const idx = db.notes.findIndex((n) => n.id === noteId);
  if (idx === -1 || db.notes[idx].spaceId !== spaceId) throw new Error("NOT_FOUND");
  const existing = db.notes[idx];
  if (existing.authorId !== requesterId) throw new Error("FORBIDDEN");
  if (existing.isDeleted) throw new Error("ALREADY_DELETED");
  if (input.images !== void 0) {
    const nextIds = new Set(input.images.map((i) => i.cloudinaryPublicId));
    for (const img of existing.images) {
      if (!nextIds.has(img.cloudinaryPublicId)) {
        await deleteStoredImage(img.cloudinaryPublicId);
      }
    }
  }
  const updated = {
    ...existing,
    content: input.content.trim(),
    tone: input.tone ?? existing.tone,
    sticker: input.sticker !== void 0 ? input.sticker : existing.sticker,
    images: input.images !== void 0 ? input.images : existing.images,
    updatedAt: now.toISOString()
  };
  db.notes[idx] = updated;
  writeLocalDb(db);
  const usersMap = new Map(db.users.map((u) => [u.id, u]));
  return hydrateNote(updated, usersMap);
}
async function softDeleteNoteByAuthor(noteId, requesterId, spaceId) {
  const now = /* @__PURE__ */ new Date();
  const mongo = await useMongo();
  if (mongo) {
    const existing2 = await NoteModel.findById(noteId);
    if (!existing2 || (existing2.spaceId || DEFAULT_SPACE_ID) !== spaceId) {
      throw new Error("NOT_FOUND");
    }
    if (existing2.authorId !== requesterId) throw new Error("FORBIDDEN");
    if (existing2.isDeleted) throw new Error("ALREADY_DELETED");
    for (const img of existing2.images) {
      await deleteStoredImage(img.cloudinaryPublicId);
    }
    existing2.content = "";
    existing2.images = [];
    existing2.sticker = null;
    existing2.isDeleted = true;
    existing2.deletedAt = now;
    await existing2.save();
    const author = await UserModel.findById(existing2.authorId);
    const usersMap2 = author ? /* @__PURE__ */ new Map([[author._id, mongoUserToRecord(author)]]) : /* @__PURE__ */ new Map();
    return hydrateNote(mongoNoteToRecord(existing2), usersMap2);
  }
  const db = readLocalDb();
  const idx = db.notes.findIndex((n) => n.id === noteId);
  if (idx === -1 || db.notes[idx].spaceId !== spaceId) throw new Error("NOT_FOUND");
  const existing = db.notes[idx];
  if (existing.authorId !== requesterId) throw new Error("FORBIDDEN");
  if (existing.isDeleted) throw new Error("ALREADY_DELETED");
  for (const img of existing.images) {
    await deleteStoredImage(img.cloudinaryPublicId);
  }
  const updated = {
    ...existing,
    content: "",
    images: [],
    sticker: null,
    isDeleted: true,
    deletedAt: now.toISOString()
  };
  db.notes[idx] = updated;
  writeLocalDb(db);
  const usersMap = new Map(db.users.map((u) => [u.id, u]));
  return hydrateNote(updated, usersMap);
}
function mongoComplimentToRecord(doc) {
  return {
    id: doc._id,
    spaceId: doc.spaceId || DEFAULT_SPACE_ID,
    authorId: doc.authorId,
    recipientId: doc.recipientId,
    content: doc.content,
    category: doc.category,
    createdAt: doc.createdAt.toISOString(),
    isDeleted: doc.isDeleted
  };
}
function mongoDrawToRecord(doc) {
  return {
    id: doc._id,
    spaceId: doc.spaceId || DEFAULT_SPACE_ID,
    complimentId: doc.complimentId,
    recipientId: doc.recipientId,
    drawnAt: doc.drawnAt.toISOString(),
    cycleNumber: doc.cycleNumber
  };
}
function hydrateCompliment(c, usersMap) {
  const author = usersMap.get(c.authorId);
  const recipient = usersMap.get(c.recipientId);
  return {
    id: c.id,
    spaceId: c.spaceId,
    authorId: c.authorId,
    authorName: author?.name ?? "Partner",
    authorAvatar: author?.avatar ?? "",
    authorAvatarPreset: author?.avatarPreset ?? "bat-cat",
    recipientId: c.recipientId,
    recipientName: recipient?.name ?? "Your partner",
    content: c.content,
    category: c.category,
    createdAt: c.createdAt
  };
}
async function getComplimentsOverview(userId, spaceId) {
  const mongo = await useMongo();
  let users;
  let compliments;
  let draws;
  if (mongo) {
    const [userDocs, complimentDocs, drawDocs] = await Promise.all([
      UserModel.find(mongoSpaceFilter(spaceId)),
      ComplimentModel.find({ spaceId, isDeleted: false }).sort({ createdAt: -1 }),
      ComplimentDrawModel.find({ spaceId, recipientId: userId }).sort({ drawnAt: -1 })
    ]);
    users = userDocs.map(mongoUserToRecord);
    compliments = complimentDocs.map(mongoComplimentToRecord);
    draws = drawDocs.map(mongoDrawToRecord);
  } else {
    const db = readLocalDb();
    users = db.users.filter((u) => u.spaceId === spaceId);
    compliments = db.compliments.filter((c) => c.spaceId === spaceId && !c.isDeleted).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    draws = db.complimentDraws.filter((d) => d.spaceId === spaceId && d.recipientId === userId).sort((a, b) => new Date(b.drawnAt).getTime() - new Date(a.drawnAt).getTime());
  }
  const usersMap = new Map(users.map((u) => [u.id, u]));
  const complimentsMap = new Map(compliments.map((c) => [c.id, c]));
  const partner = users.find((u) => u.id !== userId) ?? null;
  const forMe = compliments.filter((c) => c.recipientId === userId && c.authorId !== userId);
  const maxCycle = draws.reduce((m, d) => d.cycleNumber > m ? d.cycleNumber : m, 1);
  const drawnInCycle = new Set(
    draws.filter((d) => d.cycleNumber === maxCycle).map((d) => d.complimentId)
  );
  const undrawnInCycle = forMe.filter((c) => !drawnInCycle.has(c.id)).length;
  const remainingInCycle = forMe.length === 0 ? 0 : undrawnInCycle > 0 ? undrawnInCycle : forMe.length;
  const drawnHistory = [];
  for (const d of draws) {
    const comp = complimentsMap.get(d.complimentId);
    if (!comp) continue;
    drawnHistory.push({
      drawId: d.id,
      compliment: hydrateCompliment(comp, usersMap),
      drawnAt: d.drawnAt,
      cycleNumber: d.cycleNumber
    });
  }
  const writtenByMe = compliments.filter((c) => c.authorId === userId).map((c) => hydrateCompliment(c, usersMap));
  return {
    totalInJarForMe: forMe.length,
    remainingInCycle,
    drawnHistory,
    writtenByMe,
    partnerJoined: Boolean(partner),
    partnerName: partner?.name ?? null
  };
}
async function createCompliment(authorId, spaceId, input) {
  const complimentId = crypto3.randomUUID();
  const now = /* @__PURE__ */ new Date();
  const mongo = await useMongo();
  if (mongo) {
    const members2 = await UserModel.find(mongoSpaceFilter(spaceId));
    const author2 = members2.find((m) => m._id === authorId);
    if (!author2) throw new Error("UNAUTHORIZED");
    const partner2 = members2.find((m) => m._id !== authorId);
    const recipientId2 = partner2 ? partner2._id : PENDING_PARTNER_ID;
    const created = await ComplimentModel.create({
      _id: complimentId,
      spaceId,
      authorId,
      recipientId: recipientId2,
      content: input.content.trim(),
      category: input.category,
      createdAt: now,
      isDeleted: false
    });
    const usersMap2 = new Map(members2.map((m) => [m._id, mongoUserToRecord(m)]));
    return hydrateCompliment(mongoComplimentToRecord(created), usersMap2);
  }
  const db = readLocalDb();
  const members = db.users.filter((u) => u.spaceId === spaceId);
  const author = members.find((u) => u.id === authorId);
  if (!author) throw new Error("UNAUTHORIZED");
  const partner = members.find((u) => u.id !== authorId);
  const recipientId = partner ? partner.id : PENDING_PARTNER_ID;
  const record = {
    id: complimentId,
    spaceId,
    authorId,
    recipientId,
    content: input.content.trim(),
    category: input.category,
    createdAt: now.toISOString(),
    isDeleted: false
  };
  db.compliments.unshift(record);
  writeLocalDb(db);
  const usersMap = new Map(members.map((u) => [u.id, u]));
  return hydrateCompliment(record, usersMap);
}
async function drawRandomCompliment(recipientId, spaceId) {
  const drawId = crypto3.randomUUID();
  const now = /* @__PURE__ */ new Date();
  const mongo = await useMongo();
  let users;
  let forMe;
  let draws;
  if (mongo) {
    const [userDocs, complimentDocs, drawDocs] = await Promise.all([
      UserModel.find(mongoSpaceFilter(spaceId)),
      ComplimentModel.find({
        spaceId,
        recipientId,
        authorId: { $ne: recipientId },
        isDeleted: false
      }),
      ComplimentDrawModel.find({ spaceId, recipientId }).sort({ drawnAt: -1 })
    ]);
    users = userDocs.map(mongoUserToRecord);
    forMe = complimentDocs.map(mongoComplimentToRecord);
    draws = drawDocs.map(mongoDrawToRecord);
  } else {
    const db = readLocalDb();
    users = db.users.filter((u) => u.spaceId === spaceId);
    forMe = db.compliments.filter(
      (c) => c.spaceId === spaceId && c.recipientId === recipientId && c.authorId !== recipientId && !c.isDeleted
    );
    draws = db.complimentDraws.filter((d) => d.spaceId === spaceId && d.recipientId === recipientId).sort((a, b) => new Date(b.drawnAt).getTime() - new Date(a.drawnAt).getTime());
  }
  const lastDrawnId = draws[0]?.complimentId ?? null;
  const selection = selectNextCompliment(forMe, draws, Math.random, lastDrawnId);
  if (!selection.selected) {
    throw new Error("EMPTY_JAR");
  }
  if (mongo) {
    await ComplimentDrawModel.create({
      _id: drawId,
      spaceId,
      complimentId: selection.selected.id,
      recipientId,
      drawnAt: now,
      cycleNumber: selection.nextCycleNumber
    });
  } else {
    const db = readLocalDb();
    db.complimentDraws.unshift({
      id: drawId,
      spaceId,
      complimentId: selection.selected.id,
      recipientId,
      drawnAt: now.toISOString(),
      cycleNumber: selection.nextCycleNumber
    });
    writeLocalDb(db);
  }
  const usersMap = new Map(users.map((u) => [u.id, u]));
  return {
    draw: {
      drawId,
      compliment: hydrateCompliment(selection.selected, usersMap),
      drawnAt: now.toISOString(),
      cycleNumber: selection.nextCycleNumber
    },
    cycleReset: selection.cycleReset,
    remainingInCycle: selection.remainingInCycleAfterDraw,
    totalInJarForMe: forMe.length
  };
}
async function softDeleteComplimentByAuthor(complimentId, requesterId, spaceId) {
  const mongo = await useMongo();
  if (mongo) {
    const existing2 = await ComplimentModel.findById(complimentId);
    if (!existing2 || existing2.spaceId !== spaceId || existing2.isDeleted) {
      throw new Error("NOT_FOUND");
    }
    if (existing2.authorId !== requesterId) {
      throw new Error("FORBIDDEN");
    }
    existing2.isDeleted = true;
    await existing2.save();
    return {
      id: existing2._id,
      recipientId: existing2.recipientId,
      authorId: existing2.authorId
    };
  }
  const db = readLocalDb();
  const idx = db.compliments.findIndex((c) => c.id === complimentId);
  if (idx === -1 || db.compliments[idx].spaceId !== spaceId || db.compliments[idx].isDeleted) {
    throw new Error("NOT_FOUND");
  }
  const existing = db.compliments[idx];
  if (existing.authorId !== requesterId) {
    throw new Error("FORBIDDEN");
  }
  db.compliments[idx] = { ...existing, isDeleted: true };
  writeLocalDb(db);
  return {
    id: existing.id,
    recipientId: existing.recipientId,
    authorId: existing.authorId
  };
}

// src/server/realtime/hub.ts
import { WebSocket, WebSocketServer } from "ws";
var RealtimeHub = class {
  constructor() {
    this.wss = null;
    this.sseClients = /* @__PURE__ */ new Set();
    this.wsAttached = false;
  }
  isWsAttached() {
    return this.wsAttached;
  }
  attach(server) {
    if (this.wss) return;
    this.wsAttached = true;
    this.wss = new WebSocketServer({
      noServer: true,
      handleProtocols: (protocols) => protocols.has("ols-auth") ? "ols-auth" : false
    });
    server.on("upgrade", (req, socket, head) => {
      const url = req.url || "";
      if (!url.startsWith("/ws")) {
        return;
      }
      let token = null;
      const protoHeader = req.headers["sec-websocket-protocol"];
      if (typeof protoHeader === "string") {
        const parts = protoHeader.split(",").map((s) => s.trim());
        if (parts[0] === "ols-auth" && parts[1]) {
          token = parts[1];
        }
      }
      if (!token) {
        token = parseCookieToken(req.headers.cookie);
      }
      const session = verifySessionToken(token);
      if (!session) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      this.wss?.handleUpgrade(req, socket, head, (ws) => {
        const authed = ws;
        authed.userId = session.sub;
        authed.spaceId = session.spaceId || "primary-space";
        authed.isAlive = true;
        this.wss?.emit("connection", authed, req);
      });
    });
    this.wss.on("connection", (ws) => {
      const spaceId = ws.spaceId || "primary-space";
      this.broadcastPresence(spaceId);
      ws.on("pong", () => {
        ws.isAlive = true;
      });
      ws.on("close", () => {
        this.broadcastPresence(spaceId);
      });
      ws.on("error", () => {
        this.broadcastPresence(spaceId);
      });
    });
    const interval = setInterval(() => {
      if (!this.wss) return;
      for (const client of this.wss.clients) {
        const authed = client;
        if (authed.isAlive === false) {
          authed.terminate();
          continue;
        }
        authed.isAlive = false;
        authed.ping();
      }
    }, 3e4);
    this.wss.on("close", () => clearInterval(interval));
  }
  registerSse(userId, spaceId, res) {
    const client = { userId, spaceId, res };
    this.sseClients.add(client);
    this.broadcastPresence(spaceId);
    return () => {
      this.sseClients.delete(client);
      this.broadcastPresence(spaceId);
    };
  }
  getOnlineUserIds(spaceId) {
    const ids = /* @__PURE__ */ new Set();
    if (this.wss) {
      for (const client of this.wss.clients) {
        const authed = client;
        if (authed.readyState === WebSocket.OPEN && authed.userId && (authed.spaceId || "primary-space") === spaceId) {
          ids.add(authed.userId);
        }
      }
    }
    for (const client of this.sseClients) {
      if (client.spaceId === spaceId) {
        ids.add(client.userId);
      }
    }
    return Array.from(ids);
  }
  broadcastPresence(spaceId) {
    this.broadcast(spaceId, {
      type: "presence:update",
      payload: { onlineUserIds: this.getOnlineUserIds(spaceId) }
    });
  }
  broadcast(spaceId, event) {
    const serialized = JSON.stringify(event);
    if (this.wss) {
      for (const client of this.wss.clients) {
        const authed = client;
        if (authed.readyState === WebSocket.OPEN && (authed.spaceId || "primary-space") === spaceId) {
          authed.send(serialized);
        }
      }
    }
    for (const client of this.sseClients) {
      if (client.spaceId === spaceId) {
        client.res.write(`data: ${serialized}

`);
      }
    }
  }
};
var realtimeHub = new RealtimeHub();

// src/server/routes/api.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    // 5 MB
    files: 4
  }
});
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: "Too many authentication attempts. Please wait a few minutes." }
});
var writeLimiter = rateLimit({
  windowMs: 60 * 1e3,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: "Too many requests. Please slow down." }
});
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
function respondWithServerError(res, err, fallbackMessage) {
  if (err instanceof DatabaseConnectionError) {
    res.status(503).json({ error: err.message });
    return;
  }
  const safeName = err instanceof Error ? err.name : "UnknownError";
  console.error("[api-error]", safeName, fallbackMessage);
  res.status(500).json({ error: fallbackMessage });
}
function verifyCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const requestedWith = req.headers["x-requested-with"];
  const origin = req.headers.origin;
  const rawForwardedHost = req.headers["x-forwarded-host"];
  const forwardedHost = typeof rawForwardedHost === "string" ? rawForwardedHost.split(",")[0].trim() : Array.isArray(rawForwardedHost) ? rawForwardedHost[0]?.split(",")[0].trim() : void 0;
  const host = forwardedHost || req.headers.host;
  if (requestedWith === "XMLHttpRequest") {
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
    }
  }
  res.status(403).json({ error: "Invalid request origin." });
}
var requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractAuthToken(req);
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const user = await getUserById(payload.sub);
  if (!user) {
    res.status(401).json({ error: "Session is no longer valid." });
    return;
  }
  req.authUser = user;
  next();
});
function createApiRouter() {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use(verifyCsrf);
  router.get(
    "/health",
    asyncHandler(async (_req, res) => {
      const [mongodb, cloudinary2] = await Promise.all([pingMongoDB(), pingCloudinary()]);
      const ok = (!mongodb.configured || mongodb.connected) && (!cloudinary2.configured || cloudinary2.connected) && (process.env.VERCEL !== "1" || mongodb.configured);
      res.status(ok ? 200 : 503).json({
        status: ok ? "ok" : "error",
        application: "Our Little Space",
        database: mongodb.connected ? "connected" : mongodb.configured ? "error" : "not_configured",
        ok,
        mongodb,
        cloudinary: cloudinary2,
        auth: { configured: isAuthSecretConfigured() },
        realtimeMode: realtimeHub.isWsAttached() ? "ws" : "poll"
      });
    })
  );
  router.get(
    "/auth/status",
    asyncHandler(async (req, res) => {
      try {
        const token = extractAuthToken(req);
        const payload = verifySessionToken(token);
        const authedUser = payload ? await getUserById(payload.sub) : null;
        const status = await getSpaceStatus(authedUser?.spaceId);
        res.json({
          ...status,
          authenticated: Boolean(authedUser),
          realtimeMode: realtimeHub.isWsAttached() ? "ws" : "poll"
        });
      } catch (err) {
        respondWithServerError(res, err, "Failed to check space status.");
      }
    })
  );
  router.post(
    "/auth/setup",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = setupAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid setup input." });
        return;
      }
      try {
        const { user, inviteCode } = await createFounderAccount(parsed.data);
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        res.status(201).json({ user, inviteCode, sessionToken: token });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "SPACE_ALREADY_INITIALIZED") {
          res.status(403).json({ error: "This private space has already been initialized." });
          return;
        }
        if (msg === "EMAIL_EXISTS") {
          res.status(409).json({ error: "An account with this email already exists." });
          return;
        }
        respondWithServerError(res, err, "Failed to create account.");
      }
    })
  );
  router.post(
    "/auth/signup",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = setupAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid sign up details." });
        return;
      }
      try {
        const { user, inviteCode } = await signupWithNewSpace(parsed.data);
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        res.status(201).json({ user, inviteCode, sessionToken: token });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "EMAIL_EXISTS") {
          res.status(409).json({ error: "An account with this email already exists." });
          return;
        }
        respondWithServerError(res, err, "Failed to create account.");
      }
    })
  );
  router.post(
    "/auth/redeem-invite",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = redeemInviteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid invite details." });
        return;
      }
      try {
        const user = await redeemPartnerInvite(parsed.data);
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        realtimeHub.broadcast(user.spaceId, { type: "user:updated", payload: user });
        res.status(201).json({ user, sessionToken: token });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "SPACE_FULL") {
          res.status(403).json({ error: "This space already has two registered accounts." });
          return;
        }
        if (msg === "EMAIL_EXISTS") {
          res.status(409).json({ error: "An account with this email already exists." });
          return;
        }
        if (msg === "INVALID_INVITE") {
          res.status(403).json({ error: "Invalid or expired partner invite code." });
          return;
        }
        respondWithServerError(res, err, "Unable to redeem invite code.");
      }
    })
  );
  router.post(
    "/auth/login",
    authLimiter,
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid credentials." });
        return;
      }
      try {
        const user = await authenticateUser(parsed.data.email, parsed.data.password);
        if (!user) {
          res.status(401).json({ error: "Invalid email or password." });
          return;
        }
        const token = signSessionToken(user.id, user.role, user.spaceId);
        setSessionCookie(req, res, token);
        res.json({ user, sessionToken: token });
      } catch (err) {
        respondWithServerError(res, err, "Sign in failed.");
      }
    })
  );
  router.post("/auth/logout", (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });
  router.get(
    "/auth/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const spaceId = req.authUser.spaceId;
        const [members, space, status] = await Promise.all([
          listSpaceMembers(spaceId),
          getSpaceSettings(spaceId),
          getSpaceStatus(spaceId)
        ]);
        res.json({
          user: req.authUser,
          members,
          space,
          status: {
            ...status,
            authenticated: true,
            realtimeMode: realtimeHub.isWsAttached() ? "ws" : "poll"
          },
          onlineUserIds: realtimeHub.getOnlineUserIds(spaceId)
        });
      } catch (err) {
        respondWithServerError(res, err, "Failed to load profile.");
      }
    })
  );
  router.post(
    "/space/invite",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const inviteCode = await rotatePartnerInvite(req.authUser.id, req.authUser.spaceId);
        res.json({ inviteCode });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "SPACE_FULL") {
          res.status(400).json({ error: "Both partner accounts are already registered." });
          return;
        }
        respondWithServerError(res, err, "Could not generate invite code.");
      }
    })
  );
  router.patch(
    "/space",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateSpaceSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid space settings." });
        return;
      }
      try {
        const updated = await updateSpaceSettings(req.authUser.spaceId, parsed.data);
        realtimeHub.broadcast(req.authUser.spaceId, { type: "space:updated", payload: updated });
        res.json({ space: updated });
      } catch (err) {
        respondWithServerError(res, err, "Failed to update space settings.");
      }
    })
  );
  router.patch(
    "/profile",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid profile data." });
        return;
      }
      try {
        const updated = await updateUserProfile(req.authUser.id, parsed.data);
        realtimeHub.broadcast(req.authUser.spaceId, { type: "user:updated", payload: updated });
        res.json({ user: updated });
      } catch (err) {
        respondWithServerError(res, err, "Failed to update profile.");
      }
    })
  );
  router.patch(
    "/profile/password",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid password input." });
        return;
      }
      try {
        await changeUserPassword(
          req.authUser.id,
          parsed.data.currentPassword,
          parsed.data.newPassword
        );
        res.json({ ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "INVALID_CURRENT_PASSWORD") {
          res.status(401).json({ error: "Current password is incorrect." });
          return;
        }
        respondWithServerError(res, err, "Failed to update password.");
      }
    })
  );
  router.patch(
    "/profile/appearance",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateAppearanceSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message || "Invalid appearance preferences."
        });
        return;
      }
      try {
        const updated = await updateUserAppearance(req.authUser.id, parsed.data);
        res.json({ user: updated });
      } catch (err) {
        respondWithServerError(res, err, "Failed to save theme preferences.");
      }
    })
  );
  router.get(
    "/notes",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const search = typeof req.query.search === "string" ? req.query.search : void 0;
        const authorId = typeof req.query.authorId === "string" ? req.query.authorId : void 0;
        const sort = req.query.sort === "oldest" ? "oldest" : "newest";
        const notes = await listNotes(req.authUser.spaceId, { search, authorId, sort });
        res.json({ notes });
      } catch (err) {
        respondWithServerError(res, err, "Failed to load shared notes.");
      }
    })
  );
  router.post(
    "/notes",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = createNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid note payload." });
        return;
      }
      try {
        const note = await createNote(req.authUser.id, req.authUser.spaceId, parsed.data);
        realtimeHub.broadcast(req.authUser.spaceId, { type: "note:created", payload: note });
        res.status(201).json({ note });
      } catch (err) {
        respondWithServerError(res, err, "Failed to create note.");
      }
    })
  );
  router.patch(
    "/notes/:id",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = updateNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid note update." });
        return;
      }
      try {
        const note = await updateNoteByAuthor(
          req.params.id,
          req.authUser.id,
          req.authUser.spaceId,
          parsed.data
        );
        realtimeHub.broadcast(req.authUser.spaceId, { type: "note:updated", payload: note });
        res.json({ note });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "NOT_FOUND") {
          res.status(404).json({ error: "Note not found." });
          return;
        }
        if (msg === "FORBIDDEN") {
          res.status(403).json({ error: "You can only edit your own notes." });
          return;
        }
        if (msg === "ALREADY_DELETED") {
          res.status(400).json({ error: "Deleted notes cannot be edited." });
          return;
        }
        respondWithServerError(res, err, "Failed to update note.");
      }
    })
  );
  router.delete(
    "/notes/:id",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const note = await softDeleteNoteByAuthor(
          req.params.id,
          req.authUser.id,
          req.authUser.spaceId
        );
        realtimeHub.broadcast(req.authUser.spaceId, { type: "note:deleted", payload: note });
        res.json({ note });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "NOT_FOUND") {
          res.status(404).json({ error: "Note not found." });
          return;
        }
        if (msg === "FORBIDDEN") {
          res.status(403).json({ error: "You can only delete your own notes." });
          return;
        }
        if (msg === "ALREADY_DELETED") {
          res.status(400).json({ error: "Note is already deleted." });
          return;
        }
        respondWithServerError(res, err, "Failed to delete note.");
      }
    })
  );
  router.get(
    "/compliments",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const overview = await getComplimentsOverview(req.authUser.id, req.authUser.spaceId);
        res.json(overview);
      } catch (err) {
        respondWithServerError(res, err, "Failed to load compliments jar.");
      }
    })
  );
  router.post(
    "/compliments",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const parsed = createComplimentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid compliment." });
        return;
      }
      try {
        const compliment = await createCompliment(
          req.authUser.id,
          req.authUser.spaceId,
          parsed.data
        );
        realtimeHub.broadcast(req.authUser.spaceId, {
          type: "compliment:created",
          payload: { recipientId: compliment.recipientId, authorId: compliment.authorId }
        });
        res.status(201).json({ compliment });
      } catch (err) {
        respondWithServerError(res, err, "Failed to drop note into the jar.");
      }
    })
  );
  router.post(
    "/compliments/draw",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const result = await drawRandomCompliment(req.authUser.id, req.authUser.spaceId);
        res.status(201).json(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "EMPTY_JAR") {
          res.status(404).json({
            error: "Your jar is waiting for a little love. Ask your partner to add a note first!"
          });
          return;
        }
        respondWithServerError(res, err, "Failed to pick a note from the jar.");
      }
    })
  );
  router.delete(
    "/compliments/:id",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      try {
        const deleted = await softDeleteComplimentByAuthor(
          req.params.id,
          req.authUser.id,
          req.authUser.spaceId
        );
        realtimeHub.broadcast(req.authUser.spaceId, {
          type: "compliment:deleted",
          payload: deleted
        });
        res.json({ ok: true, id: deleted.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "NOT_FOUND") {
          res.status(404).json({ error: "Compliment note not found." });
          return;
        }
        if (msg === "FORBIDDEN") {
          res.status(403).json({ error: "You can only remove notes you wrote yourself." });
          return;
        }
        respondWithServerError(res, err, "Failed to remove compliment note.");
      }
    })
  );
  router.post(
    "/upload",
    requireAuth,
    writeLimiter,
    upload.array("images", 4),
    asyncHandler(async (req, res) => {
      const files = req.files;
      if (!files || files.length === 0) {
        res.status(400).json({ error: "Please select at least one image to upload." });
        return;
      }
      try {
        const folder = req.query.purpose === "theme" ? "our-little-space/themes" : "our-little-space/notes";
        const uploaded = [];
        for (const file of files) {
          const item = await storeImageBuffer(file.buffer, file.mimetype, folder);
          uploaded.push(item);
        }
        res.status(201).json({ images: uploaded });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Image upload failed."
        });
      }
    })
  );
  router.delete(
    "/upload",
    requireAuth,
    writeLimiter,
    asyncHandler(async (req, res) => {
      const publicId = typeof req.body?.publicId === "string" ? req.body.publicId : "";
      if (!publicId) {
        res.status(400).json({ error: "Missing publicId." });
        return;
      }
      try {
        const inUse = await isImagePublicIdReferenced(publicId);
        if (inUse) {
          res.status(409).json({
            error: "Image is currently in use and cannot be deleted from here."
          });
          return;
        }
        await deleteStoredImage(publicId);
        res.json({ ok: true });
      } catch (err) {
        respondWithServerError(res, err, "Failed to delete uploaded image.");
      }
    })
  );
  router.get("/media/:filename", requireAuth, (req, res) => {
    const safePath = resolveSafeLocalMediaPath(req.params.filename);
    if (!safePath) {
      res.status(404).json({ error: "Image not found." });
      return;
    }
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.sendFile(safePath);
  });
  router.get("/sync/stream", requireAuth, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const spaceId = req.authUser.spaceId;
    const unregister = realtimeHub.registerSse(req.authUser.id, spaceId, res);
    res.write(
      `data: ${JSON.stringify({
        type: "presence:update",
        payload: { onlineUserIds: realtimeHub.getOnlineUserIds(spaceId) }
      })}

`
    );
    const keepAlive = setInterval(() => {
      res.write(": ping\n\n");
    }, 25e3);
    req.on("close", () => {
      clearInterval(keepAlive);
      unregister();
    });
  });
  router.use((_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });
  return router;
}

// src/server/app.ts
function createApp() {
  const app2 = express2();
  app2.set("trust proxy", 1);
  app2.use(express2.json({ limit: "1mb" }));
  app2.use(cookieParser());
  app2.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /login",
        "Disallow: /api/",
        "Disallow: /notes",
        "Disallow: /memories",
        "Disallow: /settings"
      ].join("\n")
    );
  });
  app2.get("/sitemap.xml", (req, res) => {
    const baseUrl = process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" ? process.env.APP_URL.replace(/\/$/, "") : `${req.protocol}://${req.get("host")}`;
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
  });
  app2.use(["/notes", "/memories", "/settings"], (_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });
  app2.use("/api", createApiRouter());
  app2.use((err, req, res, _next) => {
    if (res.headersSent) return;
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Invalid JSON request body." });
      return;
    }
    if (err instanceof multer2.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Each image must be 5 MB or smaller." });
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        res.status(400).json({ error: "You can attach up to 4 images per note." });
        return;
      }
      res.status(400).json({ error: err.message || "Invalid image upload." });
      return;
    }
    if (err instanceof DatabaseConnectionError) {
      res.status(503).json({ error: err.message });
      return;
    }
    const safeName = err instanceof Error ? err.name : "UnknownError";
    console.error("[server-error]", { method: req.method, path: req.path, name: safeName });
    res.status(500).json({ error: "Unexpected server error. Please try again." });
  });
  return app2;
}

// src/server/vercelEntry.ts
var app = createApp();
function handler(req, res) {
  const rawUrl = req.url || "/";
  const parsed = new URL(rawUrl, "http://localhost");
  const rewrittenPath = parsed.searchParams.get("__vercel_path");
  if (rewrittenPath !== null) {
    parsed.searchParams.delete("__vercel_path");
    const qs = parsed.searchParams.toString();
    const clean = rewrittenPath.replace(/^\/+/, "");
    if (clean === "robots.txt" || clean === "sitemap.xml") {
      req.url = `/${clean}${qs ? `?${qs}` : ""}`;
    } else if (parsed.pathname === "/api" || parsed.pathname === "/api/index") {
      req.url = `/api/${clean}${qs ? `?${qs}` : ""}`;
    } else {
      req.url = `${parsed.pathname}${qs ? `?${qs}` : ""}`;
    }
  }
  app(req, res);
}
export {
  handler as default
};
