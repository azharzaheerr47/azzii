# Our Little Space

A private, cozy, two-person shared notes, memories, and illustrated sticker web application.

## Features

- **Strict Two-Person Access**: Account 1 claims the space on first run and receives a one-time partner invite code for Account 2. Once 2 accounts exist, registrations are permanently sealed.
- **Shared Notes Journal**: Pastel note cards (`white`, `lavender`, `pink`, `blue`), author-only editing (`Edited` indicator with preserved `createdAt`), and author-only soft deletion (`"This note was deleted by its author."` placeholder).
- **Image Memories & Lightbox**: Multi-image uploads (JPEG, PNG, WebP up to 5 MB) with live previews, upload progress, Cloudinary storage (with local server media fallback in preview), and a full-screen keyboard-accessible lightbox.
- **14 Illustrated Stickers**: Custom pastel vector stickers (happy/sad/crying/angry/blushing/sleeping/love/hugging cats, bat-cat, pink bow, hearts, stars, flowers, moon).
- **Real-Time Synchronization**: Authenticated WebSocket (`/ws`) + SSE fallback (`/api/sync/stream`) broadcasting new notes, edits, soft deletions, space customizations, and live partner presence.
- **Search, Filtering & Layouts**: Search notes, filter by partner or date, sort newest/oldest, and switch between Feed and Grid layouts.
- **Custom Cat Duo Favicon & Artwork**: Original vector illustration of Bat-Cat and Bow-Cat sitting together.

## Project Structure

```
├── public/favicon.svg               # Custom Cat Duo SVG favicon
├── scripts/seed.ts                  # Optional 2-partner database seed script
├── server.ts                        # Express + Vite + WebSocket server (port 3000)
├── src/
│   ├── components/
│   │   ├── artwork/                 # CatDuoIllustration, PartnerAvatar, StickerCollection
│   │   ├── layout/                  # AppShell (responsive top + mobile bottom nav)
│   │   ├── notes/                   # NoteComposer, NoteCard
│   │   └── ui/                      # ConfirmDialog, ImageLightbox, SkeletonLoaders, ToastProvider
│   ├── hooks/                       # useRealtimeSync (WebSocket + SSE reconnect)
│   ├── lib/                         # dateFormat, noteFilters, validation (Zod) + unit tests
│   ├── pages/                       # LoginPage, DashboardPage, NotesPage, MemoriesPage, SettingsPage, NotFoundPage
│   ├── server/
│   │   ├── auth/                    # scrypt password hashing, HMAC HTTP-only cookies, invite tokens
│   │   ├── db/                      # Dual repository (MongoDB Mongoose + local server DB fallback)
│   │   ├── media/                   # Cloudinary SDK + magic-byte validation
│   │   ├── models/                  # Mongoose User, Note, Space schemas & indexes
│   │   ├── realtime/                # WebSocket & SSE broadcast hub
│   │   └── routes/                  # Zod-validated, CSRF & rate-limit protected REST API
│   ├── types/                       # Shared TypeScript interfaces
│   └── utils/                       # Typed API client with XHR upload progress
└── .env.example                     # Environment variable template
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `MONGODB_URI`: MongoDB Atlas connection string (optional in local preview; falls back to `.data/space-db.json` when unset).
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary credentials for cloud image storage (optional in local preview; falls back to authenticated `.data/media/` storage when unset).
- `AUTH_SECRET`: Strong random secret (at least 16 characters) for signing HTTP-only session cookies.
- `APP_URL`: Public URL of your deployed app.

## Local Development

```bash
npm install
npm run dev
```

Optional seed script (creates 2 sample accounts `maya@ourlittlespace.app` and `leo@ourlittlespace.app` + 3 notes):

```bash
npm run seed
```

Run unit tests and type/build checks:

```bash
npm test
npm run lint
npm run build
```

## Deploying to Vercel / Cloud

1. Set `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `AUTH_SECRET`, and `APP_URL` in your Vercel Project Environment Variables.
2. Push to Vercel: `vercel.json` builds the Vite frontend (`dist/`), routes `/api/*`, `/robots.txt`, and `/sitemap.xml` to the serverless Express handler in `api/index.ts`, and routes SPA navigation to `index.html`.
3. Note on real-time sync: persistent Node hosts (`npm run build` + `npm run start`) use live WebSockets (`/ws`), while Vercel serverless deployments automatically use visibility-aware background sync polling (`realtimeMode: "poll"`).
