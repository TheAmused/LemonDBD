// frontend/src/__tests__/unit/campfireOptimization.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampfireParticles } from '@/components/common/CampfireParticles';
import { AppBackground } from '@/components/layout/AppBackground';

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
    assert.ok(source.includes('frameInterval - 2'), 'must include 2ms tolerance buffer against vsync jitter');
    assert.ok(source.includes('dtScale'), 'must scale movement in eco mode');
  });

  it('does not call ctx.save() or ctx.restore() inside the loop', () => {
    assert.ok(!source.includes('ctx.save()'), 'ctx.save() must be removed from loop');
    assert.ok(!source.includes('ctx.restore()'), 'ctx.restore() must be removed from loop');
  });
});

describe('CampfireParticles behavioral component rendering', () => {
  it('renders null / empty string when mode="off"', () => {
    const html = renderToStaticMarkup(React.createElement(CampfireParticles, { mode: 'off' }));
    assert.equal(html, '', 'CampfireParticles must render empty string when mode is off');
  });

  it('renders <canvas> when mode="on"', () => {
    const html = renderToStaticMarkup(React.createElement(CampfireParticles, { mode: 'on' }));
    assert.ok(html.includes('<canvas'), 'CampfireParticles must render canvas when mode is on');
  });
});

describe('AppBackground mode support & behavioral rendering', () => {
  const bgPath = path.resolve(__dirname, '../../components/layout/AppBackground.tsx');
  const bgSource = fs.readFileSync(bgPath, 'utf8');

  it('supports mode prop and off mode handling', () => {
    assert.ok(bgSource.includes('mode'), 'must support mode prop');
    assert.ok(bgSource.includes("'off'"), 'must check off mode');
  });

  it('rendered markup does not contain <canvas> when mode="off"', () => {
    const html = renderToStaticMarkup(React.createElement(AppBackground, { mode: 'off' }));
    assert.ok(!html.includes('<canvas'), 'AppBackground markup must not contain canvas when mode is off');
    assert.ok(html.includes('aria-hidden="true"'), 'AppBackground renders the background container');
  });
});
