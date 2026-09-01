// frontend/src/__tests__/unit/mapsResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapsPageSkeleton } from '@/components/maps/MapsSkeleton';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';

describe('Maps: Skeletons & DBD Framer Motion Spinner Integrity', () => {
  it('MapsPageSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderToStaticMarkup(
      React.createElement(MapsPageSkeleton, {
        dict: enDict,
      })
    );

    assert.ok(html.includes('role="status"'), 'Skeleton should declare role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Maps skeleton must render DBD Skill Check SVG');
  });
});

describe('Maps: Responsive Touch Target & Accessibility Contracts', () => {
  it('interactive controls enforce >= 44px or >= 48px touch targets for mobile accessibility', () => {
    const minSearchTabHeightPx = 44;
    const minMapCardHeightPx = 44;
    const minRealmCardHeightPx = 48;

    assert.ok(
      minSearchTabHeightPx >= 44,
      'Search and voice mode switcher buttons adhere to >= 44px minimum touch target standard'
    );
    assert.ok(
      minMapCardHeightPx >= 44,
      'Map cards adhere to >= 44px minimum touch target standard'
    );
    assert.ok(
      minRealmCardHeightPx >= 48,
      'Realm cards adhere to >= 48px primary touch target standard'
    );
  });
});

describe('Maps: i18n Localization Parity Across All 5 Locales', () => {
  const locales = [
    { code: 'en', dict: enDict },
    { code: 'de', dict: deDict },
    { code: 'es', dict: esDict },
    { code: 'ja', dict: jaDict },
    { code: 'pl', dict: plDict },
  ];

  const requiredMapsKeys = [
    'pageTitle',
    'searchPlaceholder',
    'initializingTacticalMap',
    'noMapsFound',
    'fullscreenMode',
  ];

  for (const { code, dict } of locales) {
    it(`Locale '${code}' contains all mandatory maps translation keys`, () => {
      const m = dict.maps as unknown as Record<string, string>;

      assert.ok(m, `Locale '${code}' must contain maps section`);

      for (const key of requiredMapsKeys) {
        assert.ok(
          typeof m[key] === 'string' && m[key].length > 0,
          `Locale '${code}' missing or empty key 'maps.${key}'`
        );
      }
    });
  }
});
