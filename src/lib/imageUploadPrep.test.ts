import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SERVERLESS_UPLOAD_BYTES,
  MAX_SOURCE_SELECTION_BYTES,
  prepareImageForUpload,
  validateImageFileCandidate,
} from './imageUploadPrep';

test('validateImageFileCandidate accepts valid JPEG, PNG, and WebP sizes and rejects unsupported/oversized files', () => {
  assert.deepEqual(validateImageFileCandidate({ type: 'image/jpeg', size: 1024 * 500 }), {
    valid: true,
  });
  assert.deepEqual(validateImageFileCandidate({ type: 'image/png', size: 2 * 1024 * 1024 }), {
    valid: true,
  });

  const badType = validateImageFileCandidate({ type: 'application/pdf', size: 1024 });
  assert.equal(badType.valid, false);

  const emptyFile = validateImageFileCandidate({ type: 'image/png', size: 0 });
  assert.equal(emptyFile.valid, false);

  const hugeFile = validateImageFileCandidate({
    type: 'image/jpeg',
    size: MAX_SOURCE_SELECTION_BYTES + 1,
  });
  assert.equal(hugeFile.valid, false);
});

test('prepareImageForUpload returns small files unchanged and rejects files exceeding 3.8 MB when canvas is unavailable', async () => {
  const smallFile = new File([new Uint8Array(1024)], 'small.png', { type: 'image/png' });
  const preparedSmall = await prepareImageForUpload(smallFile);
  assert.equal(preparedSmall, smallFile);

  const oversizedNoDom = new File(
    [new Uint8Array(MAX_SERVERLESS_UPLOAD_BYTES + 1024)],
    'large.jpg',
    { type: 'image/jpeg' },
  );
  await assert.rejects(
    () => prepareImageForUpload(oversizedNoDom),
    /exceeds the 3\.8 MB serverless upload limit/,
  );
});
