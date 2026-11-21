import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import vercelHandler from '../../api/index';

test('Vercel serverless Express handler serves API routes, SEO files, and poll realtimeMode', async () => {
  const server = http.createServer(vercelHandler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    assert.equal(robotsRes.status, 200);
    assert.match(await robotsRes.text(), /Disallow: \/api\//);

    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemapRes.status, 200);
    assert.match(await sitemapRes.text(), /<urlset/);

    const statusRes = await fetch(`${baseUrl}/api/auth/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as {
      authenticated: boolean;
      realtimeMode: string;
    };
    assert.equal(statusJson.authenticated, false);
    assert.equal(statusJson.realtimeMode, 'poll');

    const meRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(meRes.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
