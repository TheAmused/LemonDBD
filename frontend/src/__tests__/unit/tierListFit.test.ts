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

describe('Tier list fit: tile size follows the screen width and keeps constant size when adding items', () => {
  it('grows with the screen width and shrinks on smaller screens', () => {
    const tile = (w: number, h: number) => computeFit({ ...base, width: w, height: h }).tile;
    assert.ok(tile(2560, 1440) > tile(1920, 1080));
    assert.ok(tile(1920, 1080) > tile(1024, 768));
    assert.ok(tile(1024, 768) > tile(480, 854));
  });

  it('never exceeds the cap for the screen, and an empty list has the same tile size as a populated list', () => {
    const emptyFit = computeFit({ ...base, tierCounts: [0, 0, 0, 0, 0, 0], poolCount: 0 });
    const fullFit = computeFit({ ...base, tierCounts: [30, 40, 60, 60, 40, 20], poolCount: 120 });
    assert.equal(emptyFit.tile, maxTileFor(base.width, base.height));
    assert.equal(fullFit.tile, emptyFit.tile, 'adding items to tiers must not shrink tiles');
    assert.equal(emptyFit.overflow, false);
  });

  it('stays above the minimum and sets rowMin to 1 row height', () => {
    const fit = computeFit(base);
    assert.equal(fit.overflow, false);
    assert.ok(fit.tile >= MIN_TILE);
    assert.equal(fit.rowMin, fit.tile + 2 * fit.pad);
  });

  it('enables pageScroll when the tiers and pool exceed viewport height while keeping comfortable tiles', () => {
    const fit = computeFit({ ...base, width: 1920, height: 1080, tierCounts: [30, 40, 60, 60, 40, 20], poolCount: 143 });
    assert.equal(fit.pageScroll, true);
    assert.ok(fit.tile >= 80);
    assert.equal(computeFit({ ...base, width: 1920, height: 1080, tierCounts: [0, 0, 0, 0, 0, 0], poolCount: 3 }).pageScroll, false);
  });

  it('keeps item names visible at comfortable tile sizes', () => {
    const roomy = computeFit({ ...base, width: 2560, height: 1440, showNames: true });
    assert.equal(roomy.namesHidden, false);
    assert.ok(roomy.tile >= NAMES_MIN_TILE);
    assert.equal(computeFit({ ...base, showNames: false }).namesHidden, false);
  });

  it('wide (map) tiles are 1.5x as wide as tall', () => {
    const fit = computeFit({ ...base, shape: 'wide' });
    assert.equal(fit.tileWidth, Math.round(fit.tile * 1.5));
  });

  it('a collapsed pool leaves only its header', () => {
    const fit = computeFit({ ...base, poolCollapsed: true });
    assert.equal(fit.poolMinTotal, base.poolHeadHeight + 2);
  });

  it('scales tiles proportionally across percentage scale steps and shrinks to fit screen in fit mode', () => {
    const at100 = computeFit({ ...base, scale: 100 });
    const at55 = computeFit({ ...base, scale: 55 });
    const at130 = computeFit({ ...base, scale: 130 });
    assert.ok(at55.tile < at100.tile);
    assert.ok(at130.tile > at100.tile);
    assert.equal(at100.fitMode, false);

    const crowdedFit = computeFit({
      ...base,
      width: 1280,
      height: 720,
      tierCounts: [35, 35, 35, 35, 35, 35],
      poolCount: 20,
      scale: 'fit',
    });
    assert.equal(crowdedFit.fitMode, true);
    assert.ok(crowdedFit.tile < at100.tile, 'fit mode shrinks crowded tiers so they fit on screen');
  });
});

