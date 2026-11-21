import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
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

  return app;
}
