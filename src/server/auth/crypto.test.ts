import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import {
  extractAuthToken,
  hashPassword,
  parseCookieToken,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from './crypto';

test('signSessionToken and verifySessionToken round-trip valid session payloads', () => {
  const token = signSessionToken('user-founder-1', 'founder');
  const payload = verifySessionToken(token);
  assert.ok(payload);
  assert.equal(payload.sub, 'user-founder-1');
  assert.equal(payload.role, 'founder');
  assert.equal(verifySessionToken(`${token}tampered`), null);
});

test('extractAuthToken prioritizes Authorization Bearer over cookie header', () => {
  const bearerReq = {
    headers: {
      authorization: 'Bearer header-token-123',
      cookie: 'ols_session=cookie-token-456',
    },
  } as unknown as Request;

  assert.equal(extractAuthToken(bearerReq), 'header-token-123');

  const cookieOnlyReq = {
    headers: {
      cookie: 'other=1; ols_session=cookie-token-456',
    },
  } as unknown as Request;

  assert.equal(extractAuthToken(cookieOnlyReq), 'cookie-token-456');
  assert.equal(parseCookieToken(cookieOnlyReq.headers.cookie), 'cookie-token-456');
});

test('setSessionCookie sets Partitioned SameSite=None over proxied HTTPS requests', () => {
  const captured: Record<string, string> = {};
  const req = {
    headers: { 'x-forwarded-proto': 'https' },
    secure: false,
    protocol: 'http',
  } as unknown as Request;
  const res = {
    setHeader(name: string, value: string) {
      captured[name] = value;
    },
  } as unknown as Response;

  setSessionCookie(req, res, 'abc.def');
  assert.match(captured['Set-Cookie'], /HttpOnly/);
  assert.match(captured['Set-Cookie'], /Secure/);
  assert.match(captured['Set-Cookie'], /SameSite=None/);
  assert.match(captured['Set-Cookie'], /Partitioned/);
});

test('hashPassword and verifyPassword validate matching passwords only', () => {
  const hash = hashPassword('warm-latte-2026');
  assert.equal(verifyPassword('warm-latte-2026', hash), true);
  assert.equal(verifyPassword('wrong-password', hash), false);
});
