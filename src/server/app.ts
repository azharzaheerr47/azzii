import cookieParser from 'cookie-parser';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { DatabaseConnectionError } from './models/mongooseModels';
import { createApiRouter } from './routes/api';

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // SEO: robots.txt (disallows private views & API from indexing)
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /login',
        'Disallow: /api/',
        'Disallow: /notes',
        'Disallow: /memories',
        'Disallow: /settings',
      ].join('\n'),
    );
  });

  // SEO: sitemap.xml (exposes only public entry point, zero private user/note data)
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl =
      process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
        ? process.env.APP_URL.replace(/\/$/, '')
        : `${req.protocol}://${req.get('host')}`;
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
  });

  // Private HTML route indexing protection header
  app.use(['/notes', '/memories', '/settings'], (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.use('/api', createApiRouter());

  // Centralized JSON error handler so malformed JSON, Multer limits, DB failures, or unexpected throws never emit HTML 500s
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;

    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Each image must be 5 MB or smaller.' });
        return;
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({ error: 'You can attach up to 4 images per note.' });
        return;
      }
      res.status(400).json({ error: err.message || 'Invalid image upload.' });
      return;
    }

    if (err instanceof DatabaseConnectionError) {
      console.error('[server-db-error]', {
        method: req.method,
        path: req.originalUrl || req.path,
        status: 503,
        code: err.code,
      });
      res.status(503).json({ error: err.message });
      return;
    }

    const safeName = err instanceof Error ? err.name : 'UnknownError';
    console.error('[server-error]', {
      method: req.method,
      path: req.originalUrl || req.path,
      status: 500,
      name: safeName,
    });
    res.status(500).json({ error: 'Unexpected server error. Please try again.' });
  });

  return app;
}
