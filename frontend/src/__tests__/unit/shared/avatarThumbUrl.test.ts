import test from 'node:test';
import assert from 'node:assert/strict';
import { getAssetThumbUrl, getAssetUrl, getAvatarThumbUrl, getAvatarUrl } from '../../../components/character-detail/types';
import { getPerkIconThumbUrl, getPerkIconUrl } from '../../../utils/perkUtils';

const BASE = 'https://api.example.com';

test('getAvatarThumbUrl: local avatars route through the thumbnail endpoint', () => {
  const char = { name: 'Meg Thomas', avatar_local_path: 'avatars/survivors/meg_thomas.webp' } as never;
  assert.equal(getAvatarThumbUrl(BASE, char, true), `${BASE}/api/v1/thumbs/avatars/256/survivors/meg_thomas.webp`);
  assert.equal(getAvatarUrl(BASE, char, true), `${BASE}/static/avatars/survivors/meg_thomas.webp`);
});

test('getAvatarThumbUrl: remote-only avatars keep the original URL', () => {
  const char = { name: '', avatar_url: 'https://cdn.example.com/x.png' } as never;
  assert.equal(getAvatarThumbUrl(BASE, char, false), getAvatarUrl(BASE, char, false));
});

test('getAssetThumbUrl: local icons use the thumbnail endpoint, remote and non-icon paths stay as they are', () => {
  assert.equal(getAssetThumbUrl(BASE, 'icons/addons/a.png'), `${BASE}/api/v1/thumbs/icons/128/addons/a.png`);
  assert.equal(getAssetThumbUrl(BASE, '/static/icons/items/b.webp', undefined, 96), `${BASE}/api/v1/thumbs/icons/96/items/b.webp`);
  assert.equal(getAssetThumbUrl(BASE, undefined, 'https://cdn.example.com/c.png'), 'https://cdn.example.com/c.png');
  assert.equal(getAssetThumbUrl(BASE, 'maps/x.png'), getAssetUrl(BASE, 'maps/x.png'));
});

test('getAssetThumbUrl: width snaps to the closest allowed icon width', () => {
  assert.equal(getAssetThumbUrl(BASE, 'icons/perks/a.png', undefined, 200), `${BASE}/api/v1/thumbs/icons/256/perks/a.png`);
  assert.equal(getAssetThumbUrl(BASE, 'icons/perks/a.png', undefined, 100), `${BASE}/api/v1/thumbs/icons/128/perks/a.png`);
});

test('getAssetThumbUrl: keeps a query suffix and strips percent signs like getPerkIconUrl does', () => {
  assert.equal(getAssetThumbUrl(BASE, 'icons/perks/a.png?v=2'), `${BASE}/api/v1/thumbs/icons/128/perks/a.png?v=2`);
  const perk = { icon_local_path: 'icons/perks/a%20b.png' };
  assert.equal(getAssetUrl(BASE, perk.icon_local_path), getPerkIconUrl(perk, BASE));
  assert.equal(getAssetThumbUrl(BASE, perk.icon_local_path), getPerkIconThumbUrl(perk, 128, BASE));
});

test('getPerkIconThumbUrl: local icons use the thumbnail endpoint, others pass through, none gives null', () => {
  assert.equal(getPerkIconThumbUrl({ icon_local_path: 'icons/perks/a.png' }, 96, BASE), `${BASE}/api/v1/thumbs/icons/96/perks/a.png`);
  assert.equal(getPerkIconThumbUrl({ icon_url: 'https://cdn.example.com/a.png' }, 128, BASE), 'https://cdn.example.com/a.png');
  assert.equal(getPerkIconThumbUrl(null, 128, BASE), null);
});
