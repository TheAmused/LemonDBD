import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { publicImageThumb } from '@/utils/publicThumb';
import { buildPublicThumbs, resolveThumbWidth } from '../../../../scripts/build-public-thumbs.mjs';

test('publicImageThumb maps bundled images with pre-generated thumbs to _thumbs', () => {
  assert.equal(publicImageThumb('/images/tarot/the-entity.webp'), '/images/_thumbs/tarot/the-entity.webp');
  assert.equal(publicImageThumb('/images/tarot/faces/00.webp'), '/images/_thumbs/tarot/faces/00.webp');
  assert.equal(publicImageThumb('/images/streaks/modes/chaos-hell.webp'), '/images/_thumbs/streaks/modes/chaos-hell.webp');
  assert.equal(publicImageThumb('/images/streaks/id-please/k3.webp'), '/images/_thumbs/streaks/id-please/k3.webp');
  assert.equal(publicImageThumb('/images/randomizer/crate.webp'), '/images/_thumbs/randomizer/crate.webp');
});

test('publicImageThumb leaves unthumbnailed paths and external URLs unchanged', () => {
  assert.equal(publicImageThumb('/images/addon-rarity/common.webp'), '/images/addon-rarity/common.webp');
  assert.equal(publicImageThumb('/images/banners/banner_account.webp'), '/images/banners/banner_account.webp');
  assert.equal(publicImageThumb('/images/_thumbs/tarot/the-entity.webp'), '/images/_thumbs/tarot/the-entity.webp');
  assert.equal(publicImageThumb('https://example.com/x.webp'), 'https://example.com/x.webp');
  assert.equal(publicImageThumb('data:image/webp;base64,AAA'), 'data:image/webp;base64,AAA');
});

test('publicImageThumb normalizes raster extensions to webp and ignores non-raster files', () => {
  assert.equal(publicImageThumb('/images/tarot/card.png'), '/images/_thumbs/tarot/card.webp');
  assert.equal(publicImageThumb('/images/randomizer/crate.webp?v=2'), '/images/_thumbs/randomizer/crate.webp?v=2');
  assert.equal(publicImageThumb('/images/tarot/icon.svg'), '/images/tarot/icon.svg');
  assert.equal(publicImageThumb(''), '');
});

test('resolveThumbWidth applies most-specific prefix rules and filters non-raster or uncovered paths', () => {
  assert.equal(resolveThumbWidth('tarot/the-entity.webp'), 320);
  assert.equal(resolveThumbWidth('streaks/modes/chaos-hell.webp'), 360);
  assert.equal(resolveThumbWidth('streaks/id-please/k3.webp'), 256);
  assert.equal(resolveThumbWidth('randomizer/crate.webp'), 400);
  assert.equal(resolveThumbWidth('addon-rarity/common.webp'), null);
  assert.equal(resolveThumbWidth('tarot/readme.txt'), null);
});

test('buildPublicThumbs generates, incrementally skips, and prunes orphaned thumbnails', async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'public-thumbs-'));
  try {
    await fs.mkdir(path.join(tmpRoot, 'tarot'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'streaks', 'modes'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, 'addon-rarity'), { recursive: true });

    const createPng = (width: number, height: number) =>
      sharp({ create: { width, height, channels: 3, background: { r: 120, g: 80, b: 40 } } })
        .webp()
        .toBuffer();

    const tarotSrc = path.join(tmpRoot, 'tarot', 'card.webp');
    const modeSrc = path.join(tmpRoot, 'streaks', 'modes', 'hell.webp');
    const uncoveredSrc = path.join(tmpRoot, 'addon-rarity', 'common.webp');

    await fs.writeFile(tarotSrc, await createPng(600, 900));
    await fs.writeFile(modeSrc, await createPng(500, 500));
    await fs.writeFile(uncoveredSrc, await createPng(200, 200));

    const first = await buildPublicThumbs({ imagesRoot: tmpRoot });
    assert.deepEqual(first, { generated: 2, skipped: 0, pruned: 0 });

    const tarotMeta = await sharp(path.join(tmpRoot, '_thumbs', 'tarot', 'card.webp')).metadata();
    const modeMeta = await sharp(path.join(tmpRoot, '_thumbs', 'streaks', 'modes', 'hell.webp')).metadata();
    assert.equal(tarotMeta.width, 320);
    assert.equal(modeMeta.width, 360);

    const uncoveredThumbExists = await fs
      .stat(path.join(tmpRoot, '_thumbs', 'addon-rarity', 'common.webp'))
      .then(() => true)
      .catch(() => false);
    assert.equal(uncoveredThumbExists, false);

    const second = await buildPublicThumbs({ imagesRoot: tmpRoot });
    assert.deepEqual(second, { generated: 0, skipped: 2, pruned: 0 });

    await fs.unlink(modeSrc);
    const third = await buildPublicThumbs({ imagesRoot: tmpRoot });
    assert.deepEqual(third, { generated: 0, skipped: 1, pruned: 1 });

    const orphanedDirExists = await fs
      .stat(path.join(tmpRoot, '_thumbs', 'streaks'))
      .then(() => true)
      .catch(() => false);
    assert.equal(orphanedDirExists, false);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});
