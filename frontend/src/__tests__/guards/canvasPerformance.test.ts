// frontend/src/__tests__/guards/canvasPerformance.test.ts
//
// The campfire particles run a canvas loop on every page. These calls are costly per frame and were
// removed on purpose; the loop also stops while the tab is hidden.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../../components/common/CampfireParticles.tsx'), 'utf8');

describe('campfire canvas loop', () => {
  it('draws without shadows (shadowBlur / shadowColor cost a blur pass per particle)', () => {
    assert.ok(!source.includes('ctx.shadowBlur') && !source.includes('ctx.shadowColor'));
  });

  it('does not save and restore the context inside the loop', () => {
    assert.ok(!source.includes('ctx.save()') && !source.includes('ctx.restore()'));
  });

  it('stops while the tab is hidden', () => {
    assert.ok(source.includes('visibilitychange') && source.includes('document.hidden'));
  });
});
