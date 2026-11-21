import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInviteLink,
  extractInviteCodeFromSearch,
  normalizeInviteCode,
} from './inviteLink';

test('normalizeInviteCode uppercases valid codes and rejects empty or malformed input', () => {
  assert.equal(normalizeInviteCode(' abcd-1234 '), 'ABCD-1234');
  assert.equal(normalizeInviteCode(''), null);
  assert.equal(normalizeInviteCode(null), null);
  assert.equal(normalizeInviteCode('ab'), null);
  assert.equal(normalizeInviteCode('<script>'), null);
});

test('extractInviteCodeFromSearch extracts ?invite= and ?code= parameters safely', () => {
  assert.equal(extractInviteCodeFromSearch('?invite=xy12-ab34'), 'XY12-AB34');
  assert.equal(extractInviteCodeFromSearch('code=9876-WXYZ'), '9876-WXYZ');
  assert.equal(extractInviteCodeFromSearch('?foo=bar'), null);
});

test('buildInviteLink formats /join?invite= URL without trailing slash duplication', () => {
  assert.equal(
    buildInviteLink('https://ourlittlespace.vercel.app/', 'abcd-1234'),
    'https://ourlittlespace.vercel.app/join?invite=ABCD-1234',
  );
});
