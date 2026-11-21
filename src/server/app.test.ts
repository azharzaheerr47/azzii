import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import vercelHandler from './vercelEntry';

const TEMP_DB = path.resolve(process.cwd(), '.data');

test('Vercel serverless Express handler serves API, rewrites, JSON errors, 503 on missing VERCEL DB, and full 2-user lifecycle', async () => {
  fs.rmSync(TEMP_DB, { recursive: true, force: true });

  const server = http.createServer(vercelHandler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. SEO endpoints (direct + Vercel __vercel_path rewrite)
    const robotsRes = await fetch(`${baseUrl}/api/index?__vercel_path=robots.txt`);
    assert.equal(robotsRes.status, 200);
    assert.match(await robotsRes.text(), /Disallow: \/api\//);

    const sitemapRes = await fetch(`${baseUrl}/api/index?__vercel_path=sitemap.xml`);
    assert.equal(sitemapRes.status, 200);
    assert.match(await sitemapRes.text(), /<urlset/);

    // 2. Auth status via __vercel_path rewrite returns poll mode
    const statusRes = await fetch(`${baseUrl}/api/index?__vercel_path=auth/status`);
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as {
      authenticated: boolean;
      realtimeMode: string;
    };
    assert.equal(statusJson.authenticated, false);
    assert.equal(statusJson.realtimeMode, 'poll');

    // 3. Unauthenticated private route rejected (401)
    const meRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(meRes.status, 401);

    // 4. Malformed JSON returns structured 400 JSON (never HTML 500)
    const badJsonRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: '{"email":',
    });
    assert.equal(badJsonRes.status, 400);
    const badJson = (await badJsonRes.json()) as { error: string };
    assert.match(badJson.error, /Invalid JSON/);

    // 5. Unknown API endpoint returns 404 JSON
    const missingApi = await fetch(`${baseUrl}/api/unknown-endpoint`);
    assert.equal(missingApi.status, 404);
    assert.equal(((await missingApi.json()) as { error: string }).error, 'API endpoint not found.');

    // 6. VERCEL=1 without MONGODB_URI fails gracefully with 503 JSON (not HTML 500)
    const prevVercel = process.env.VERCEL;
    const prevUri = process.env.MONGODB_URI;
    process.env.VERCEL = '1';
    delete process.env.MONGODB_URI;
    try {
      const noDbRes = await fetch(`${baseUrl}/api/auth/status`);
      assert.equal(noDbRes.status, 503);
      const noDbJson = (await noDbRes.json()) as { error: string };
      assert.match(noDbJson.error, /MONGODB_URI/);
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prevVercel;
      if (prevUri !== undefined) process.env.MONGODB_URI = prevUri;
    }

    // 7. Full 2-user registration, 3rd-user lock, note create/edit/delete & ownership checks
    const setupRes = await fetch(`${baseUrl}/api/auth/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        name: 'Maya',
        email: 'maya@example.com',
        password: 'StrongPassword1!',
        avatarPreset: 'bow-cat',
      }),
    });
    assert.equal(setupRes.status, 201);
    const setupData = (await setupRes.json()) as {
      inviteCode: string;
      sessionToken: string;
      user: { id: string };
    };
    assert.ok(setupData.inviteCode);
    assert.ok(setupData.sessionToken);

    const redeemRes = await fetch(`${baseUrl}/api/auth/redeem-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        inviteCode: setupData.inviteCode,
        name: 'Leo',
        email: 'leo@example.com',
        password: 'StrongPassword2!',
        avatarPreset: 'bat-cat',
      }),
    });
    assert.equal(redeemRes.status, 201);
    const redeemData = (await redeemRes.json()) as {
      sessionToken: string;
      user: { id: string };
    };

    // Third user blocked permanently
    const thirdUserRes = await fetch(`${baseUrl}/api/auth/redeem-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        inviteCode: setupData.inviteCode,
        name: 'Eve',
        email: 'eve@example.com',
        password: 'StrongPassword3!',
        avatarPreset: 'sky',
      }),
    });
    assert.equal(thirdUserRes.status, 403);

    // Maya creates note
    const createNoteRes = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${setupData.sessionToken}`,
      },
      body: JSON.stringify({
        content: 'Coffee date note',
        tone: 'lavender',
        sticker: 'happy-cat',
        images: [],
      }),
    });
    assert.equal(createNoteRes.status, 201);
    const createdNote = ((await createNoteRes.json()) as { note: { id: string; createdAt: string } }).note;

    // Leo cannot edit or delete Maya's note
    const leoEditRes = await fetch(`${baseUrl}/api/notes/${createdNote.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${redeemData.sessionToken}`,
      },
      body: JSON.stringify({ content: 'Hijacked' }),
    });
    assert.equal(leoEditRes.status, 403);

    const leoDelRes = await fetch(`${baseUrl}/api/notes/${createdNote.id}`, {
      method: 'DELETE',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${redeemData.sessionToken}`,
      },
    });
    assert.equal(leoDelRes.status, 403);

    // Maya edits her note -> updatedAt set, createdAt preserved
    const mayaEditRes = await fetch(`${baseUrl}/api/notes/${createdNote.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${setupData.sessionToken}`,
      },
      body: JSON.stringify({ content: 'Coffee date updated' }),
    });
    assert.equal(mayaEditRes.status, 200);
    const editedNote = ((await mayaEditRes.json()) as {
      note: { content: string; createdAt: string; updatedAt: string | null };
    }).note;
    assert.equal(editedNote.content, 'Coffee date updated');
    assert.equal(editedNote.createdAt, createdNote.createdAt);
    assert.ok(editedNote.updatedAt);

    // Maya soft-deletes her note -> still visible as deleted placeholder
    const mayaDelRes = await fetch(`${baseUrl}/api/notes/${createdNote.id}`, {
      method: 'DELETE',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${setupData.sessionToken}`,
      },
    });
    assert.equal(mayaDelRes.status, 200);
    const deletedNote = ((await mayaDelRes.json()) as {
      note: { isDeleted: boolean; content: string };
    }).note;
    assert.equal(deletedNote.isDeleted, true);
    assert.equal(deletedNote.content, '');

    // List notes via __vercel_path rewrite confirms note persists
    const listRes = await fetch(`${baseUrl}/api/index?__vercel_path=notes`, {
      headers: { Authorization: `Bearer ${redeemData.sessionToken}` },
    });
    assert.equal(listRes.status, 200);
    const listJson = (await listRes.json()) as { notes: Array<{ id: string; isDeleted: boolean }> };
    assert.equal(listJson.notes.length, 1);
    assert.equal(listJson.notes[0].isDeleted, true);

    // Password hashes are never exposed in /api/auth/me
    const authedMeRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${setupData.sessionToken}` },
    });
    assert.equal(authedMeRes.status, 200);
    const meRaw = await authedMeRes.text();
    assert.equal(meRaw.includes('passwordHash'), false);
  } finally {
    fs.rmSync(TEMP_DB, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
