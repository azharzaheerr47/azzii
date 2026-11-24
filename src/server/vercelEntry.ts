import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app';

const app = createApp();

export function normalizeVercelRequestUrl(rawUrl: string | undefined): string {
  const safeRaw = rawUrl && rawUrl.startsWith('/') ? rawUrl : `/${rawUrl || ''}`;
  const parsed = new URL(safeRaw, 'http://localhost');
  const rewrittenPath = parsed.searchParams.get('__vercel_path');

  if (rewrittenPath !== null) {
    parsed.searchParams.delete('__vercel_path');
    const qs = parsed.searchParams.toString();
    const clean = rewrittenPath.replace(/^\/+/, '');
    if (clean === 'robots.txt' || clean === 'sitemap.xml') {
      return `/${clean}${qs ? `?${qs}` : ''}`;
    }
    if (parsed.pathname === '/api' || parsed.pathname === '/api/index') {
      return clean ? `/api/${clean}${qs ? `?${qs}` : ''}` : `/api${qs ? `?${qs}` : ''}`;
    }
    return `${parsed.pathname}${qs ? `?${qs}` : ''}`;
  }

  return `${parsed.pathname}${parsed.search}`;
}

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  req.url = normalizeVercelRequestUrl(req.url);

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    res.once('finish', finish);
    res.once('close', finish);

    try {
      app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
    } catch (err) {
      const safeName = err instanceof Error ? err.name : 'UnknownError';
      console.error('[vercel-entry-error]', { url: req.url, method: req.method, name: safeName });
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Unexpected server error. Please try again.' }));
      } else if (!res.writableEnded) {
        res.end();
      }
      finish();
    }
  });
}
