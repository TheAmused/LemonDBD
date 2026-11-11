import test from 'node:test';
import assert from 'node:assert/strict';
import {
  avatarThumbFromPath,
  fallbackThroughSources,
  getChapterThumbSrc,
  getCommunityCoverThumbUrl,
  getIconThumbUrl,
  getRealmThumbSrc,
  getThumbUrl,
} from '@/utils/thumbUrl';
import { resolveSmashPortraitUrls } from '@/components/smash-or-pass/smashAvatarUrl';

const BASE = 'https://api.example.com';

test('getThumbUrl converts static and relative paths to /api/v1/thumbs/<cat>/<width>/<rel>', () => {
  assert.equal(
    getThumbUrl('avatars', '/static/avatars/killers/trapper.png', 256, ''),
    '/api/v1/thumbs/avatars/256/killers/trapper.png',
  );
  assert.equal(
    getThumbUrl('avatars', 'avatars/killers/trapper.webp', 128, BASE),
    `${BASE}/api/v1/thumbs/avatars/128/killers/trapper.webp`,
  );
  assert.equal(
    getThumbUrl('avatars', `${BASE}/static/avatars/survivors/meg_thomas.webp`, 256, BASE),
    `${BASE}/api/v1/thumbs/avatars/256/survivors/meg_thomas.webp`,
  );
  assert.equal(
    getThumbUrl('maps', 'maps/callouts/lemondbd/macmillan/coal_tower.webp', 320, BASE),
    `${BASE}/api/v1/thumbs/maps/320/callouts/lemondbd/macmillan/coal_tower.webp`,
  );
  assert.equal(
    getThumbUrl('maps', 'callouts/lemondbd/macmillan/coal_tower.webp', 320, ''),
    '/api/v1/thumbs/maps/320/callouts/lemondbd/macmillan/coal_tower.webp',
  );
});

test('getThumbUrl maps community uploads subdir uploads/community/ to community thumbs', () => {
  assert.equal(
    getThumbUrl('community', '/static/uploads/community/abc.webp', 480, ''),
    '/api/v1/thumbs/community/480/abc.webp',
  );
  assert.equal(
    getThumbUrl('community', 'uploads/community/nested/abc.png', 256, BASE),
    `${BASE}/api/v1/thumbs/community/256/nested/abc.png`,
  );
  assert.equal(
    getThumbUrl('community', 'abc.jpg', 128, ''),
    '/api/v1/thumbs/community/128/abc.jpg',
  );
});

test('getThumbUrl leaves empty, external, data, blob, already-thumbnailed, and non-raster paths safe', () => {
  assert.equal(getThumbUrl('avatars', null, 256, BASE), '');
  assert.equal(getThumbUrl('avatars', undefined, 256, BASE), '');
  assert.equal(getThumbUrl('avatars', '   ', 256, BASE), '');

  assert.equal(
    getThumbUrl('avatars', 'https://cdn.example.com/static/avatars/a.png', 256, BASE),
    'https://cdn.example.com/static/avatars/a.png',
  );
  assert.equal(
    getThumbUrl('community', 'https://example.com/cover.webp', 480, ''),
    'https://example.com/cover.webp',
  );
  assert.equal(
    getThumbUrl('community', 'data:image/png;base64,AAAA', 480, ''),
    'data:image/png;base64,AAAA',
  );
  assert.equal(
    getThumbUrl('community', 'blob:https://lemondbd.com/1234', 480, ''),
    'blob:https://lemondbd.com/1234',
  );
  assert.equal(
    getThumbUrl('icons', '/static/icons/perks/icon.svg', 128, BASE),
    `${BASE}/static/icons/perks/icon.svg`,
  );
  assert.equal(
    getThumbUrl('icons', 'icons/audio/clip.ogg', 128, ''),
    '/static/icons/audio/clip.ogg',
  );
  assert.equal(
    getThumbUrl('avatars', '/api/v1/thumbs/avatars/128/killers/trapper.webp', 128, BASE),
    `${BASE}/api/v1/thumbs/avatars/128/killers/trapper.webp`,
  );
  assert.equal(
    getThumbUrl('avatars', '/static/other/banner.webp', 256, ''),
    '/static/other/banner.webp',
  );
  assert.equal(
    getThumbUrl('community', '/images/banners/banner_account.webp', 480, ''),
    '/images/banners/banner_account.webp',
  );
});

test('specialized thumbnail helpers handle local paths, objects, remote URLs, and nulls', () => {
  assert.equal(avatarThumbFromPath(null, 256, BASE), '');
  assert.equal(
    avatarThumbFromPath('avatars/survivors/meg_thomas.webp', 128, ''),
    '/api/v1/thumbs/avatars/128/survivors/meg_thomas.webp',
  );

  assert.equal(getChapterThumbSrc(null, 480, BASE), '');
  assert.equal(
    getChapterThumbSrc({ banner_path: 'chapters/chapter_1.png', banner_url: 'https://wiki.gg/c1.png' }, 480, ''),
    '/api/v1/thumbs/chapters/480/chapter_1.png',
  );
  assert.equal(
    getChapterThumbSrc({ banner_local_path: 'chapters/chapter_2.webp', banner_url: 'https://wiki.gg/c2.webp' }, 480, BASE),
    `${BASE}/api/v1/thumbs/chapters/480/chapter_2.webp`,
  );
  assert.equal(
    getChapterThumbSrc({ banner_url: 'https://wiki.gg/c3.png' }, 480, BASE),
    'https://wiki.gg/c3.png',
  );
  assert.equal(
    getChapterThumbSrc('/static/chapters/chapter_4.jpg', 480, ''),
    '/api/v1/thumbs/chapters/480/chapter_4.jpg',
  );

  assert.equal(getRealmThumbSrc(undefined, 320, BASE), '');
  assert.equal(
    getRealmThumbSrc('realms/autohaven_wreckers.webp', 320, ''),
    '/api/v1/thumbs/realms/320/autohaven_wreckers.webp',
  );

  assert.equal(getIconThumbUrl(null, 128, BASE), '');
  assert.equal(
    getIconThumbUrl('icons/perks/sprint_burst.png', 96, ''),
    '/api/v1/thumbs/icons/96/perks/sprint_burst.png',
  );
  assert.equal(
    getIconThumbUrl('https://wiki.dbd/icon.png', 128, BASE),
    'https://wiki.dbd/icon.png',
  );
});

test('getCommunityCoverThumbUrl routes community, smash-or-pass, and tier-lists covers and leaves others untouched', () => {
  assert.equal(getCommunityCoverThumbUrl(null, 480, ''), '');
  assert.equal(
    getCommunityCoverThumbUrl('/static/uploads/community/cover.webp', 480, ''),
    '/api/v1/thumbs/community/480/cover.webp',
  );
  assert.equal(
    getCommunityCoverThumbUrl('/static/smash-or-pass/cover_placeholder_1.webp', 480, BASE),
    `${BASE}/api/v1/thumbs/smash-or-pass/480/cover_placeholder_1.webp`,
  );
  assert.equal(
    getCommunityCoverThumbUrl('/static/tier-lists/banner_survivors.webp', 480, ''),
    '/api/v1/thumbs/tier-lists/480/banner_survivors.webp',
  );
  assert.equal(
    getCommunityCoverThumbUrl('https://cdn.example.com/custom.webp', 480, BASE),
    'https://cdn.example.com/custom.webp',
  );
  assert.equal(
    getCommunityCoverThumbUrl('data:image/webp;base64,BBB', 480, BASE),
    'data:image/webp;base64,BBB',
  );
  assert.equal(
    getCommunityCoverThumbUrl('/images/banners/default.webp', 480, BASE),
    '/images/banners/default.webp',
  );
  assert.equal(
    getCommunityCoverThumbUrl('/static/unknown/cover.webp', 480, BASE),
    '/static/unknown/cover.webp',
  );
});

test('getThumbUrl and getCommunityCoverThumbUrl snap requested widths to backend THUMB_SPECS', () => {
  assert.equal(
    getCommunityCoverThumbUrl('/static/tier-lists/banner.webp', 256, ''),
    '/api/v1/thumbs/tier-lists/480/banner.webp',
  );
  assert.equal(
    getThumbUrl('smash-or-pass', '/static/smash-or-pass/card.webp', 128, ''),
    '/api/v1/thumbs/smash-or-pass/256/card.webp',
  );
  assert.equal(
    getThumbUrl('avatars', '/static/avatars/killers/trapper.webp', 999, ''),
    '/api/v1/thumbs/avatars/256/killers/trapper.webp',
  );
  assert.equal(
    getThumbUrl('icons', '/static/icons/perks/sprint.png', 100, ''),
    '/api/v1/thumbs/icons/128/perks/sprint.png',
  );
  assert.equal(
    getThumbUrl('maps', '/static/maps/coal.webp', 100, ''),
    '/api/v1/thumbs/maps/320/coal.webp',
  );
  assert.equal(
    getThumbUrl('icons', 'perk.svg', 128, ''),
    '/static/icons/perk.svg',
  );
});

test('resolveSmashPortraitUrls preserves data:, blob:, community, and official avatar URLs', () => {
  const uploadedData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
  const fromData = resolveSmashPortraitUrls(
    { name: 'Custom Upload', slug: 'custom-upload', media_url: uploadedData, roster_id: 'local-1' },
    { backendBase: BASE, thumbWidth: 256, useLocalPlaceholder: true },
  );
  assert.equal(fromData.hasPortrait, true);
  assert.equal(fromData.fullSrc, uploadedData);
  assert.equal(fromData.thumbSrc, uploadedData);

  const fromBlob = resolveSmashPortraitUrls(
    { name: 'Blob Upload', slug: 'blob-upload', media_url: 'blob:https://lemondbd.test/123', roster_id: 'local-1' },
    { backendBase: BASE, thumbWidth: 256, useLocalPlaceholder: true },
  );
  assert.equal(fromBlob.fullSrc, 'blob:https://lemondbd.test/123');
  assert.equal(fromBlob.thumbSrc, 'blob:https://lemondbd.test/123');

  const fromCommunity = resolveSmashPortraitUrls(
    { name: 'Official Upload', slug: 'official-upload', media_url: '/static/uploads/community/abc123.webp' },
    { backendBase: BASE, thumbWidth: 128 },
  );
  assert.equal(fromCommunity.fullSrc, `${BASE}/static/uploads/community/abc123.webp`);
  assert.equal(fromCommunity.thumbSrc, `${BASE}/api/v1/thumbs/community/128/abc123.webp`);
});

test('getThumbUrl: icons snap to the closest allowed width, 256 being the largest', () => {
  assert.equal(getThumbUrl('icons', 'icons/perks/a.png', 200, ''), '/api/v1/thumbs/icons/256/perks/a.png');
  assert.equal(getThumbUrl('icons', 'icons/perks/a.png', 1000, ''), '/api/v1/thumbs/icons/256/perks/a.png');
  assert.equal(getThumbUrl('icons', 'icons/perks/a.png', 100, ''), '/api/v1/thumbs/icons/128/perks/a.png');
});

test('getThumbUrl: a query or hash suffix survives the rewrite', () => {
  assert.equal(
    getThumbUrl('icons', '/static/icons/perks/a.png?v=3#x', 128, ''),
    '/api/v1/thumbs/icons/128/perks/a.png?v=3#x'
  );
});

function fakeImg() {
  const img = { src: 'thumb', style: { display: '' }, dataset: {} as Record<string, string> };
  return { img, event: { currentTarget: img } as never };
}

test('fallbackThroughSources: retries each original once, in order, then hides the image', () => {
  const handler = fallbackThroughSources('/static/a.png', 'https://cdn.example.com/a.png');
  const { img, event } = fakeImg();
  handler(event);
  assert.equal(img.src, '/static/a.png');
  handler(event);
  assert.equal(img.src, 'https://cdn.example.com/a.png');
  assert.equal(img.style.display, '');
  handler(event);
  assert.equal(img.style.display, 'none');
});

test('fallbackThroughSources: skips empty and repeated sources', () => {
  const handler = fallbackThroughSources('/static/a.png', undefined, '', '/static/a.png');
  const { img, event } = fakeImg();
  handler(event);
  assert.equal(img.src, '/static/a.png');
  handler(event);
  assert.equal(img.style.display, 'none');
});

test('fallbackThroughSources: without sources it only hides the image', () => {
  const { img, event } = fakeImg();
  fallbackThroughSources(null)(event);
  assert.equal(img.style.display, 'none');
  assert.equal(img.src, 'thumb');
});
