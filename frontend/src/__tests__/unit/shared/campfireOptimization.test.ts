// frontend/src/__tests__/unit/shared/campfireOptimization.test.ts
// What the background renders per mode. (The canvas-loop performance rules are guards/canvasPerformance.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CampfireParticles } from '@/components/common/CampfireParticles';
import { AppBackground } from '@/components/layout/AppBackground';



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
  it('rendered markup does not contain <canvas> when mode="off"', () => {
    const html = renderToStaticMarkup(React.createElement(AppBackground, { mode: 'off' }));
    assert.ok(!html.includes('<canvas'), 'AppBackground markup must not contain canvas when mode is off');
    assert.ok(html.includes('aria-hidden="true"'), 'AppBackground renders the background container');
  });
});
