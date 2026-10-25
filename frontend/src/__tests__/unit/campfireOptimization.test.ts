// frontend/src/__tests__/unit/campfireOptimization.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('CampfireParticles optimization & guardrails', () => {
  const componentPath = path.resolve(__dirname, '../../components/common/CampfireParticles.tsx');
  const source = fs.readFileSync(componentPath, 'utf8');

  it('never uses ctx.shadowBlur or ctx.shadowColor in render loop', () => {
    assert.ok(!source.includes('ctx.shadowBlur'), 'shadowBlur is too expensive on canvas loop');
    assert.ok(!source.includes('ctx.shadowColor'), 'shadowColor must be removed');
  });

  it('subscribes to document visibilitychange to halt loop in background', () => {
    assert.ok(source.includes('visibilitychange'), 'must listen for visibilitychange');
    assert.ok(source.includes('document.hidden'), 'must check document.hidden');
  });

  it('supports eco mode with reduced particles and frame throttling', () => {
    assert.ok(source.includes("mode === 'eco'"), 'must check eco mode');
  });
});

describe('AppBackground mode support', () => {
  const bgPath = path.resolve(__dirname, '../../components/layout/AppBackground.tsx');
  const bgSource = fs.readFileSync(bgPath, 'utf8');

  it('supports mode prop and off mode handling', () => {
    assert.ok(bgSource.includes('mode'), 'must support mode prop');
    assert.ok(bgSource.includes("'off'"), 'must check off mode');
  });
});
