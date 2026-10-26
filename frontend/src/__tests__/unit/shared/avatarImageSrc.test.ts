// frontend/src/__tests__/unit/shared/avatarImageSrc.test.ts
// Avatars load from this site only: a remote URL would be a tracking pixel in admins' browsers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarImageSrc } from '@/components/UserAvatar';

test('uploads and other same-origin paths load', () => {
  assert.equal(avatarImageSrc('/api/v1/auth/avatar/file/avatar_u1_1_ab.webp'), '/api/v1/auth/avatar/file/avatar_u1_1_ab.webp');
  assert.equal(avatarImageSrc('uploads/avatars/a.webp'), '/uploads/avatars/a.webp');
});

test('remote, data, script and protocol-relative values fall back to the default picture', () => {
  for (const value of ['https://evil.example/p.gif', 'http://x/y', 'data:image/png;base64,AA', 'javascript:alert(1)', '//evil.example/p.gif', 'default_avatar', '']) {
    assert.equal(avatarImageSrc(value), '', value);
  }
});

test('a blob: URL loads only as the local upload preview', () => {
  assert.equal(avatarImageSrc('blob:https://site/123', true), 'blob:https://site/123');
  assert.equal(avatarImageSrc('blob:https://site/123'), '');
});
