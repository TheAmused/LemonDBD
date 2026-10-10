// frontend/src/__tests__/unit/tierListFit.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_TILE, NAMES_MIN_TILE, computeFit, maxTileFor, type FitInput } from '../../utils/tierLists/fit';

const base: FitInput = {
  width: 1280,
  height: 720,
  tierCounts: [4, 8, 12, 12, 8, 4],
  poolCount: 12,
  shape: 'square',
  showNames: false,
  poolCollapsed: false,
  poolHeadHeight: 48,
};

describe('Tier list fit: tile size follows the room', () => {
  it('grows with the screen and shrinks with it', () => {
    const tile = (w: number, h: number) => computeFit({ ...base, width: w, height: h }).tile;
    assert.ok(tile(2560, 1440) > tile(1920, 1080));
    assert.ok(tile(1920, 1080) > tile(1024, 768));
    assert.ok(tile(1024, 768) > tile(480, 854));
  });

  it('never exceeds the cap for the screen, and a nearly empty list does not balloon', () => {
    const fit = computeFit({ ...base, tierCounts: [0, 0, 0, 0, 0, 0], poolCount: 0 });
    assert.ok(fit.tile <= maxTileFor(base.width, base.height));
    assert.equal(fit.overflow, false);
  });

  it('a fitting result does not overflow and stays above the minimum', () => {
    const fit = computeFit(base);
    assert.equal(fit.overflow, false);
    assert.ok(fit.tile >= MIN_TILE);
    assert.equal(fit.rowMin, fit.tile + 2 * fit.pad);
  });

  it('more items give smaller tiles', () => {
    const few = computeFit({ ...base, tierCounts: [2, 2, 2, 2, 2, 2] });
    const many = computeFit({ ...base, tierCounts: [30, 40, 60, 60, 40, 20] });
    assert.ok(many.tile < few.tile);
  });

  it('hides item names instead of shrinking the image below the readable size', () => {
    const cramped = computeFit({ ...base, width: 854, height: 480, showNames: true });
    assert.equal(cramped.namesHidden, true);
    const roomy = computeFit({ ...base, width: 2560, height: 1440, showNames: true });
    assert.equal(roomy.namesHidden, false);
    assert.ok(roomy.tile >= NAMES_MIN_TILE);
    assert.equal(computeFit({ ...base, showNames: false }).namesHidden, false, 'a setting that is already off is not reported as hidden');
  });

  it('falls back to overflow only when even the minimum tile cannot fit', () => {
    const fit = computeFit({ ...base, width: 420, height: 480, tierCounts: [60, 80, 120, 120, 80, 40], poolCount: 40 });
    assert.equal(fit.overflow, true);
    assert.equal(fit.tile, MIN_TILE);
  });

  it('wide (map) tiles are 1.5x as wide as tall', () => {
    const fit = computeFit({ ...base, shape: 'wide' });
    assert.equal(fit.tileWidth, Math.round(fit.tile * 1.5));
  });

  it('a collapsed pool leaves only its header', () => {
    const fit = computeFit({ ...base, poolCollapsed: true });
    assert.equal(fit.poolMinTotal, base.poolHeadHeight + 2);
  });
});
