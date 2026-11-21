import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app';

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const rewrittenPath = parsed.searchParams.get('__vercel_path');

  if (rewrittenPath !== null) {
    parsed.searchParams.delete('__vercel_path');
    const qs = parsed.searchParams.toString();
    const clean = rewrittenPath.replace(/^\/+/, '');
    if (clean === 'robots.txt' || clean === 'sitemap.xml') {
      req.url = `/${clean}${qs ? `?${qs}` : ''}`;
    } else if (parsed.pathname === '/api' || parsed.pathname === '/api/index') {
      req.url = `/api/${clean}${qs ? `?${qs}` : ''}`;
    } else {
      req.url = `${parsed.pathname}${qs ? `?${qs}` : ''}`;
    }
  }

  app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
