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
    const space2Partner = (await space2PartnerRes.json()) as { sessionToken: string };

    // 9. Profile bio update works cleanly
    const bioRes = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Signup.sessionToken}`,
      },
      body: JSON.stringify({
        name: 'Azhar',
        avatarPreset: 'bat-cat',
        bio: 'Sunflowers & late night tea',
      }),
    });
    assert.equal(bioRes.status, 200);
    const bioData = (await bioRes.json()) as { user: { bio: string } };
    assert.equal(bioData.user.bio, 'Sunflowers & late night tea');

    // 10. Compliments Jar: Azhar writes 3 compliments for Sam, Sam draws without repeats & cannot delete Azhar's notes
    const compIds: string[] = [];
    for (const [idx, text] of [
      'Your laugh makes every day lighter.',
      'Thank you for bringing me warm coffee.',
      'I adore the way you notice little details.',
    ].entries()) {
      const cRes = await fetch(`${baseUrl}/api/compliments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${space2Signup.sessionToken}`,
        },
        body: JSON.stringify({
          content: text,
          category: idx === 0 ? 'Your smile' : 'Something I adore',
        }),
      });
      assert.equal(cRes.status, 201);
      const createdComp = (await cRes.json()) as { compliment: { id: string } };
      compIds.push(createdComp.compliment.id);
    }

    // Sam's overview hides unseen compliment contents before drawing
    const samOverviewRes = await fetch(`${baseUrl}/api/compliments`, {
      headers: { Authorization: `Bearer ${space2Partner.sessionToken}` },
    });
    assert.equal(samOverviewRes.status, 200);
    const samOverviewRaw = await samOverviewRes.text();
    assert.equal(samOverviewRaw.includes('warm coffee'), false);
    const samOverview = JSON.parse(samOverviewRaw) as {
      totalInJarForMe: number;
      remainingInCycle: number;
      drawnHistory: unknown[];
    };
    assert.equal(samOverview.totalInJarForMe, 3);
    assert.equal(samOverview.remainingInCycle, 3);
    assert.equal(samOverview.drawnHistory.length, 0);

    // Sam draws 3 notes: all 3 unique IDs, no repeats
    const drawnIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const drawRes = await fetch(`${baseUrl}/api/compliments/draw`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${space2Partner.sessionToken}`,
        },
      });
      assert.equal(drawRes.status, 201);
      const drawJson = (await drawRes.json()) as {
        draw: { compliment: { id: string } };
        cycleReset: boolean;
      };
      assert.equal(drawJson.cycleReset, false);
      drawnIds.push(drawJson.draw.compliment.id);
    }
    assert.equal(new Set(drawnIds).size, 3);

    // 4th draw starts a fresh cycle
    const round2Res = await fetch(`${baseUrl}/api/compliments/draw`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Partner.sessionToken}`,
      },
    });
    assert.equal(round2Res.status, 201);
    const round2Json = (await round2Res.json()) as { cycleReset: boolean };
    assert.equal(round2Json.cycleReset, true);

    // Sam cannot delete Azhar's compliment (403)
    const samDelRes = await fetch(`${baseUrl}/api/compliments/${compIds[0]}`, {
      method: 'DELETE',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Partner.sessionToken}`,
      },
    });
    assert.equal(samDelRes.status, 403);

    // Azhar CAN delete his own compliment (200)
    const azharDelRes = await fetch(`${baseUrl}/api/compliments/${compIds[0]}`, {
      method: 'DELETE',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Signup.sessionToken}`,
      },
    });
    assert.equal(azharDelRes.status, 200);

    // 11. Per-user theme appearance persistence, validation, and safe image cleanup
    const invalidCustomRes = await fetch(`${baseUrl}/api/profile/appearance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Signup.sessionToken}`,
      },
      body: JSON.stringify({
        themeMode: 'custom',
        romanticMode: false,
        customBackground: null,
      }),
    });
    assert.equal(invalidCustomRes.status, 400);

    // Upload a valid 1x1 PNG for Azhar's theme background (?purpose=theme)
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const form1 = new FormData();
    form1.append('images', new Blob([tinyPng], { type: 'image/png' }), 'bg1.png');
    const upload1Res = await fetch(`${baseUrl}/api/upload?purpose=theme`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Signup.sessionToken}`,
      },
      body: form1,
    });
    assert.equal(upload1Res.status, 201);
    const upload1Json = (await upload1Res.json()) as {
      images: Array<{ secureUrl: string; cloudinaryPublicId: string; width: number; height: number }>;
    };
    const bg1 = upload1Json.images[0];
    assert.ok(bg1.cloudinaryPublicId.startsWith('local/'));

    const applyBg1Res = await fetch(`${baseUrl}/api/profile/appearance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Signup.sessionToken}`,
      },
      body: JSON.stringify({
        themeMode: 'custom',
        romanticMode: false,
        customBackground: {
          url: bg1.secureUrl,
          publicId: bg1.cloudinaryPublicId,
          position: 'center',
          scale: 112,
          blur: 8,
          brightness: 82,
          overlayOpacity: 42,
          overlayMode: 'dark',
        },
      }),
    });
    assert.equal(applyBg1Res.status, 200);

    // Deleting an actively used background photo is blocked with 409
    const blockedDeleteRes = await fetch(`${baseUrl}/api/upload`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Signup.sessionToken}`,
      },
      body: JSON.stringify({ publicId: bg1.cloudinaryPublicId }),
    });
    assert.equal(blockedDeleteRes.status, 409);

    // Sam sets Romantic Mode independently; Azhar keeps his custom theme
    const samRomanticRes = await fetch(`${baseUrl}/api/profile/appearance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Partner.sessionToken}`,
      },
      body: JSON.stringify({
        themeMode: 'system',
        romanticMode: true,
        customBackground: null,
      }),
    });
    assert.equal(samRomanticRes.status, 200);

    const [azharCheckRes, samCheckRes] = await Promise.all([
      fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${space2Signup.sessionToken}` },
      }),
      fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${space2Partner.sessionToken}` },
      }),
    ]);
    const azharCheck = (await azharCheckRes.json()) as {
      user: { appearance: { themeMode: string; romanticMode: boolean; customBackground: { publicId: string } | null } };
    };
    const samCheck = (await samCheckRes.json()) as {
      user: { appearance: { themeMode: string; romanticMode: boolean; customBackground: unknown } };
    };
    assert.equal(azharCheck.user.appearance.themeMode, 'custom');
    assert.equal(azharCheck.user.appearance.romanticMode, false);
    assert.equal(azharCheck.user.appearance.customBackground?.publicId, bg1.cloudinaryPublicId);
    assert.equal(samCheck.user.appearance.themeMode, 'system');
    assert.equal(samCheck.user.appearance.romanticMode, true);
    assert.equal(samCheck.user.appearance.customBackground, null);

    // Azhar resets to default -> unreferenced local bg1 image is cleaned up
    const localBg1File = path.resolve(
      process.cwd(),
      '.data',
      'media',
      bg1.cloudinaryPublicId.replace(/^local\//, ''),
    );
    assert.equal(fs.existsSync(localBg1File), true);
    const resetThemeRes = await fetch(`${baseUrl}/api/profile/appearance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Signup.sessionToken}`,
      },
      body: JSON.stringify({
        themeMode: 'system',
        romanticMode: false,
        customBackground: null,
      }),
    });
    assert.equal(resetThemeRes.status, 200);
    assert.equal(fs.existsSync(localBg1File), false);

    // 12. Vercel __vercel_path rewrite parity for Compliments Jar, Custom Theme Upload, and Romantic Mode
    const rewriteCompRes = await fetch(`${baseUrl}/api?__vercel_path=compliments`, {
      headers: { Authorization: `Bearer ${space2Partner.sessionToken}` },
    });
    assert.equal(rewriteCompRes.status, 200);
    const rewriteCompJson = (await rewriteCompRes.json()) as { totalInJarForMe: number };
    assert.equal(rewriteCompJson.totalInJarForMe, 2);

    const rewriteRomanticOff = await fetch(`${baseUrl}/api?__vercel_path=profile/appearance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Partner.sessionToken}`,
      },
      body: JSON.stringify({
        themeMode: 'dark',
        romanticMode: false,
        customBackground: null,
      }),
    });
    assert.equal(rewriteRomanticOff.status, 200);
    const rewriteRomanticJson = (await rewriteRomanticOff.json()) as {
      user: { appearance: { themeMode: string; romanticMode: boolean } };
    };
    assert.equal(rewriteRomanticJson.user.appearance.themeMode, 'dark');
    assert.equal(rewriteRomanticJson.user.appearance.romanticMode, false);

    // Theme upload via __vercel_path=upload&purpose=theme rewrite preserves query params
    const form2 = new FormData();
    form2.append('images', new Blob([tinyPng], { type: 'image/png' }), 'bg2.png');
    const rewriteUploadRes = await fetch(`${baseUrl}/api?__vercel_path=upload&purpose=theme`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Partner.sessionToken}`,
      },
      body: form2,
    });
    assert.equal(rewriteUploadRes.status, 201);
    const rewriteUploadJson = (await rewriteUploadRes.json()) as {
      images: Array<{ secureUrl: string; cloudinaryPublicId: string }>;
    };
    assert.equal(rewriteUploadJson.images.length, 1);

    // Invalid fake image upload rejected cleanly with 400 JSON
    const badForm = new FormData();
    badForm.append('images', new Blob(['not-an-image'], { type: 'image/png' }), 'fake.png');
    const badUploadRes = await fetch(`${baseUrl}/api/upload?purpose=theme`, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${space2Partner.sessionToken}`,
      },
      body: badForm,
    });
    assert.equal(badUploadRes.status, 400);

    // Unauthenticated requests to Compliment Jar, Upload, and Appearance return 401 JSON
    const [unauthComp, unauthUpload, unauthAppearance] = await Promise.all([
      fetch(`${baseUrl}/api/compliments`),
      fetch(`${baseUrl}/api/upload?purpose=theme`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      }),
      fetch(`${baseUrl}/api/profile/appearance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ themeMode: 'system', romanticMode: true, customBackground: null }),
      }),
    ]);
    assert.equal(unauthComp.status, 401);
    assert.equal(unauthUpload.status, 401);
    assert.equal(unauthAppearance.status, 401);

    // VERCEL=1 without MONGODB_URI fails with structured 503 JSON on Compliments Jar & Appearance
    process.env.VERCEL = '1';
    delete process.env.MONGODB_URI;
    try {
      const [noDbComp, noDbApp] = await Promise.all([
        fetch(`${baseUrl}/api/compliments`, {
          headers: { Authorization: `Bearer ${space2Partner.sessionToken}` },
        }),
        fetch(`${baseUrl}/api/profile/appearance`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Authorization: `Bearer ${space2Partner.sessionToken}`,
          },
          body: JSON.stringify({ themeMode: 'system', romanticMode: true, customBackground: null }),
        }),
      ]);
      assert.equal(noDbComp.status, 503);
      assert.equal(noDbApp.status, 503);
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prevVercel;
      if (prevUri !== undefined) process.env.MONGODB_URI = prevUri;
    }
  } finally {
    fs.rmSync(TEMP_DB, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});

test('isCloudinaryConfigured supports both split env vars and CLOUDINARY_URL', async () => {
  const { isCloudinaryConfigured } = await import('./media/imageService');
  const prevName = process.env.CLOUDINARY_CLOUD_NAME;
  const prevKey = process.env.CLOUDINARY_API_KEY;
  const prevSecret = process.env.CLOUDINARY_API_SECRET;
  const prevUrl = process.env.CLOUDINARY_URL;

  try {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_URL;
    assert.equal(isCloudinaryConfigured(), false);

    process.env.CLOUDINARY_URL = 'cloudinary://123456:mysecret@mycloud';
    assert.equal(isCloudinaryConfigured(), true);

    delete process.env.CLOUDINARY_URL;
    process.env.CLOUDINARY_CLOUD_NAME = '"mycloud"';
    process.env.CLOUDINARY_API_KEY = '123456';
    process.env.CLOUDINARY_API_SECRET = 'mysecret';
    assert.equal(isCloudinaryConfigured(), true);
  } finally {
    if (prevName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = prevName;
    if (prevKey === undefined) delete process.env.CLOUDINARY_API_KEY;
    else process.env.CLOUDINARY_API_KEY = prevKey;
    if (prevSecret === undefined) delete process.env.CLOUDINARY_API_SECRET;
    else process.env.CLOUDINARY_API_SECRET = prevSecret;
    if (prevUrl === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = prevUrl;
  }
});
