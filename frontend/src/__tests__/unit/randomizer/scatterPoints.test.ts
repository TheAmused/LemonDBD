// frontend/src/__tests__/unit/randomizer/scatterPoints.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chaosPoints, scatterField } from '@/components/generator/lib/scatterPoints';

// Real phone and tablet screens (portrait and landscape): width x height.
const SCREENS: ReadonlyArray<readonly [number, number]> = [
  [320, 640],
  [360, 740],
  [390, 844],
  [430, 932],
  [600, 960],
  [700, 1000],
  [768, 1024],
  [820, 1180],
  [834, 1194],
  [1024, 768],
  [1024, 1366],
  [1180, 820],
];

describe('Loot Crate phone and tablet scatter', () => {
  it('never lets two perks overlap and keeps every perk inside the field, on every screen and throw size', () => {
    for (const [w, h] of SCREENS) {
      const field = scatterField(w, h);
      for (let count = 8; count <= 12; count++) {
        for (let run = 0; run < 100; run++) {
          const px = chaosPoints(count, field).map((p) => ({ x: (p.x / 100) * field.width, y: (p.y / 100) * field.height }));
          assert.equal(px.length, count);
          for (const p of px) {
            assert.ok(p.x >= field.marginPx - 0.5 && p.x <= field.width - field.marginPx + 0.5, `${w}x${h}: x out of the field: ${p.x}`);
            assert.ok(p.y >= field.marginPx - 0.5 && p.y <= field.height - field.marginPx + 0.5, `${w}x${h}: y out of the field: ${p.y}`);
          }
          for (let i = 0; i < px.length; i++) {
            for (let j = i + 1; j < px.length; j++) {
              const dist = Math.hypot(px[i].x - px[j].x, px[i].y - px[j].y);
              assert.ok(dist >= field.minGapPx - 0.5, `${w}x${h}, ${count} perks, run ${run}: two perks only ${dist.toFixed(1)}px apart`);
            }
          }
        }
      }
    }
  });

  it('spreads the perks over the whole field instead of piling them up', () => {
    for (const [w, h] of SCREENS) {
      const field = scatterField(w, h);
      const innerH = field.height - 2 * field.marginPx;
      let totalSpread = 0;
      const runs = 100;
      for (let run = 0; run < runs; run++) {
        const ys = chaosPoints(10, field).map((p) => (p.y / 100) * field.height);
        totalSpread += (Math.max(...ys) - Math.min(...ys)) / innerH;
      }
      assert.ok(totalSpread / runs >= 0.8, `${w}x${h}: perks cover only ${(100 * totalSpread / runs).toFixed(0)}% of the field height`);
    }
  });

  it('does not put perks on a grid: the same count gives different layouts', () => {
    const field = scatterField(390, 844);
    assert.notDeepEqual(chaosPoints(10, field), chaosPoints(10, field));
  });
});
