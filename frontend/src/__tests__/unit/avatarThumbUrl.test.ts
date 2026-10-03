import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvatarThumbUrl, getAvatarUrl } from '../../components/character-detail/types';

const BASE = 'https://api.example.com';

test('getAvatarThumbUrl: local avatars route through the thumbnail endpoint', () => {
  const char = { name: 'Meg Thomas', avatar_local_path: 'avatars/survivors/meg_thomas.webp' } as never;
  assert.equal(getAvatarThumbUrl(BASE, char, true), `${BASE}/api/v1/avatars/thumb/survivors/meg_thomas.webp`);
  assert.equal(getAvatarUrl(BASE, char, true), `${BASE}/static/avatars/survivors/meg_thomas.webp`);
});

test('getAvatarThumbUrl: remote-only avatars keep the original URL', () => {
  const char = { name: '', avatar_url: 'https://cdn.example.com/x.png' } as never;
  assert.equal(getAvatarThumbUrl(BASE, char, false), getAvatarUrl(BASE, char, false));
});
