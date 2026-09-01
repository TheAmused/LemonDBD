// frontend/src/__tests__/unit/dbdSpinner.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DbdSpinner } from '@/components/DbdSpinner';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';

describe('DbdSpinner: Core Visual & Dead by Daylight Skill Check Rendering', () => {
  it('renders Dead by Daylight Skill Check dial SVG with correct viewBox and geometry', () => {
    const html = renderToStaticMarkup(
      React.createElement(DbdSpinner, {
        size: 'lg',
        accent: 'crimson',
        label: 'Calibrating Trial Coordinates...',
      })
    );

    assert.ok(html.includes('viewBox="0 0 160 160"'), 'SVG must use 160x160 coordinate space');
    assert.ok(html.includes('r="58"'), 'Skill check circular track must be rendered');
    assert.ok(html.includes('stroke-dasharray="16 348"'), 'Great Skill Check Zone arc must be rendered');
    assert.ok(html.includes('stroke-dasharray="66 298"'), 'Good Success Zone arc must be rendered');
    assert.ok(html.includes('role="status"'), 'Container must have role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Container must have aria-busy="true"');
    assert.ok(html.includes('Calibrating Trial Coordinates...'), 'Custom label must be present in DOM');
  });

  it('renders central LemonDBD emblem icon when showEmblem is true', () => {
    const htmlWith = renderToStaticMarkup(
      React.createElement(DbdSpinner, {
        size: 'md',
        showEmblem: true,
      })
    );

    assert.ok(htmlWith.includes('stroke="currentColor"'), 'Emblem should render lemon icon paths');
  });
});

describe('DbdSpinner: Layout Modes, Sizes & Accents', () => {
  const layouts = ['fullscreen', 'page', 'card', 'inline', 'compact'] as const;
  for (const layout of layouts) {
    it(`Renders in layout ${layout}`, () => {
      const html = renderToStaticMarkup(
        React.createElement(DbdSpinner, { layout })
      );
      assert.ok(html.includes('role="status"'), 'Layout must have role=status');
    });
  }

  const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'responsive', 240] as const;
  for (const size of sizes) {
    it(`Renders in size ${size}`, () => {
      const html = renderToStaticMarkup(
        React.createElement(DbdSpinner, { size })
      );
      assert.ok(html.includes('role="status"'), 'Size must render valid status container');
    });
  }

  const accents = ['crimson', 'amber', 'emerald', 'cyan', 'violet', 'blood', 'gold', 'neon'] as const;
  for (const accent of accents) {
    it(`Renders with accent ${accent}`, () => {
      const html = renderToStaticMarkup(
        React.createElement(DbdSpinner, { accent })
      );
      assert.ok(html.includes('role="status"'), 'Accent must have role=status');
    });
  }

  it('Renders with customColors overrides correctly', () => {
    const html = renderToStaticMarkup(
      React.createElement(DbdSpinner, {
        customColors: {
          greatZone: '#ff0055',
          needle: '#ff3377',
          glow: 'rgba(255, 0, 85, 0.8)',
          text: 'text-rose-500',
        },
      })
    );
    assert.ok(html.includes('stroke="#ff0055"'), 'Custom great zone color must be in SVG');
    assert.ok(html.includes('fill="#ff3377"'), 'Custom needle color must be in SVG');
  });
});

describe('DbdSpinner: i18n Localization Parity', () => {
  const locales = [
    { code: 'en', dict: enDict },
    { code: 'de', dict: deDict },
    { code: 'es', dict: esDict },
    { code: 'ja', dict: jaDict },
    { code: 'pl', dict: plDict },
  ];
  for (const { code, dict } of locales) {
    it(`Locale ${code} has valid loading label fallback`, () => {
      const html = renderToStaticMarkup(
        React.createElement(DbdSpinner, { dict })
      );
      const expectedLabel = dict.app?.loading || dict.characterDetail?.loading;
      assert.ok(expectedLabel && expectedLabel.length > 0, 'Valid label found');
      assert.ok(html.includes(expectedLabel), 'Spinner must render localized label');
    });
  }
});
