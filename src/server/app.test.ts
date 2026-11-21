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
    // 1. SEO endpoints (Vercel /api?__vercel_path=... rewrite)
    const robotsRes = await fetch(`${baseUrl}/api?__vercel_path=robots.txt`);
    assert.equal(robotsRes.status, 200);
    assert.match(await robotsRes.text(), /Disallow: \/api\//);

    const sitemapRes = await fetch(`${baseUrl}/api?__vercel_path=sitemap.xml`);
    assert.equal(sitemapRes.status, 200);
    assert.match(await sitemapRes.text(), /<urlset/);

    // 2. Auth status and health via /api?__vercel_path=... rewrite return poll mode
    const healthRes = await fetch(`${baseUrl}/api?__vercel_path=health`);
    assert.equal(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as {
      status: string;
      application: string;
      realtimeMode: string;
    };
    assert.equal(healthJson.status, 'ok');
    assert.equal(healthJson.application, 'Our Little Space');
    assert.equal(healthJson.realtimeMode, 'poll');

    const statusRes = await fetch(`${baseUrl}/api?__vercel_path=auth/status`);
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

    // List notes via /api?__vercel_path rewrite confirms note persists
    const listRes = await fetch(`${baseUrl}/api?__vercel_path=notes`, {
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

    // Authenticated password change rejects wrong current password and updates on valid input
    const badPwChangeRes = await fetch(`${baseUrl}/api/profile/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${setupData.sessionToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongCurrentPassword!',
        newPassword: 'UpdatedPassword9!',
      }),
    });
    assert.equal(badPwChangeRes.status, 401);

    const okPwChangeRes = await fetch(`${baseUrl}/api/profile/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${setupData.sessionToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'StrongPassword1!',
        newPassword: 'UpdatedPassword9!',
      }),
    });
    assert.equal(okPwChangeRes.status, 200);

    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'maya@example.com',
        password: 'StrongPassword1!',
      }),
    });
    assert.equal(oldLoginRes.status, 401);

    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'maya@example.com',
        password: 'UpdatedPassword9!',
      }),
    });
    assert.equal(newLoginRes.status, 200);

    // 8. Sign up creates a brand-new isolated private space even after Space 1 is full
    const space2SignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        name: 'Azhar',
        email: 'azhar@example.com',
        password: 'SpaceTwoPassword1!',
        avatarPreset: 'bat-cat',
        spaceName: 'Azhar & Partner',
      }),
    });
    assert.equal(space2SignupRes.status, 201);
    const space2Signup = (await space2SignupRes.json()) as {
      inviteCode: string;
      sessionToken: string;
      user: { id: string; spaceId: string };
    };
    assert.ok(space2Signup.inviteCode);
    assert.notEqual(space2Signup.user.spaceId, 'primary-space');

    // Duplicate email rejected cleanly (409)
    const dupEmailRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        name: 'Azhar 2',
        email: 'azhar@example.com',
        password: 'SpaceTwoPassword1!',
        avatarPreset: 'sky',
      }),
    });
    assert.equal(dupEmailRes.status, 409);

    // Space 2 user cannot see Space 1's notes and gets customized space settings
    const space2MeRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${space2Signup.sessionToken}` },
    });
    assert.equal(space2MeRes.status, 200);
    const space2Me = (await space2MeRes.json()) as {
      space: { spaceName: string };
      members: Array<{ id: string }>;
      status: { userCount: number };
    };
    assert.equal(space2Me.space.spaceName, 'Azhar & Partner');
    assert.equal(space2Me.members.length, 1);
    assert.equal(space2Me.status.userCount, 1);

    const space2NotesRes = await fetch(`${baseUrl}/api/notes`, {
      headers: { Authorization: `Bearer ${space2Signup.sessionToken}` },
    });
    assert.equal(space2NotesRes.status, 200);
    const space2Notes = (await space2NotesRes.json()) as { notes: unknown[] };
    assert.equal(space2Notes.notes.length, 0);

    // Partner 2 joins Space 2 using Space 2's invite code
    const space2PartnerRes = await fetch(`${baseUrl}/api/auth/redeem-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        inviteCode: space2Signup.inviteCode,
        name: 'Sam',
        email: 'sam@example.com',
        password: 'SpaceTwoPassword2!',
        avatarPreset: 'bow-cat',
      }),
    });
    assert.equal(space2PartnerRes.status, 201);
  } finally {
    fs.rmSync(TEMP_DB, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
