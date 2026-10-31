// frontend/src/__tests__/unit/smash/dragBackgroundEmbers.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createScene, drawScene, type DragState } from '@/components/smash-or-pass/dragBackgroundScene';

function idleState(showEmbers: boolean): DragState {
  return {
    dragX: 0,
    dragY: 0,
    isDragging: false,
    smashIntensity: 0,
    passIntensity: 0,
    superIntensity: 0,
    actionTrigger: null,
    triggerKey: 0,
    isPaused: false,
    showEmbers,
  };
}

/** A 2D context that only counts the circles drawn (the embers are the only circles in an idle scene). */
function countingContext() {
  const counts = { arcs: 0 };
  const noop = () => {};
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) => (key === 'arc' ? () => void counts.arcs++ : noop),
      set: () => true,
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, counts };
}

describe('Smash or Pass ambient embers', () => {
  it('draw while the campfire switch is on', () => {
    const { ctx, counts } = countingContext();
    drawScene(ctx, createScene(800, 600), idleState(true), 800, 600);
    assert.ok(counts.arcs > 0);
  });

  it('are not drawn once the campfire switch is off', () => {
    const { ctx, counts } = countingContext();
    drawScene(ctx, createScene(800, 600), idleState(false), 800, 600);
    assert.equal(counts.arcs, 0);
  });
});
