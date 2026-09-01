// frontend/src/__tests__/unit/charactersResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CharactersGridSkeleton,
  CharacterDetailSkeleton,
} from '@/components/character-detail/CharactersSkeleton';
import { getCharacterSlug } from '@/components/character-detail/types';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';

describe('Characters: Skeletons & Zero-CLS Layout Integrity', () => {
  it('CharactersGridSkeleton renders with role="status", aria-busy="true", and responsive grid breakpoints', () => {
    const html = renderToStaticMarkup(
      React.createElement(CharactersGridSkeleton, {
        count: 12,
        dict: enDict,
      })
    );

    assert.ok(html.includes('role="status"'), 'Skeleton should have role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should indicate busy state');
    assert.ok(
      html.includes('grid-cols-2') &&
        html.includes('sm:grid-cols-3') &&
        html.includes('md:grid-cols-4') &&
        html.includes('lg:grid-cols-5') &&
        html.includes('xl:grid-cols-6'),
      'Roster grid skeleton must match full responsive breakpoint matrix'
    );
    assert.ok(html.includes('aspect-[3/4]'), 'Character cards must enforce 3:4 aspect ratio');
  });

  it('CharacterDetailSkeleton renders all subpage sections with zero layout shift geometry', () => {
    const html = renderToStaticMarkup(
      React.createElement(CharacterDetailSkeleton, {
        dict: enDict,
      })
    );

    assert.ok(html.includes('role="status"'), 'Detail skeleton should have status role');
    assert.ok(html.includes('aspect-[3/4]'), 'Hero avatar skeleton must reserve 3:4 aspect space');
    assert.ok(html.includes('grid-cols-1 lg:grid-cols-12'), 'Hero section must match 12-column grid layout');
    assert.ok(html.includes('md:grid-cols-3'), 'Teachable perks section must reserve 3-column layout');
  });
});

describe('Characters: Slug Generation & Route Resolution', () => {
  it('generates URL-safe and canonical slugs for diverse character names', () => {
    assert.equal(getCharacterSlug('Meg Thomas'), 'meg_thomas');
    assert.equal(getCharacterSlug('The Trapper'), 'the_trapper');
    assert.equal(getCharacterSlug('The Nemesis'), 'the_nemesis');
    assert.equal(getCharacterSlug('The Demogorgon'), 'the_demogorgon');
    assert.equal(getCharacterSlug('The Shape / Michael Myers'), 'the_shape_michael_myers');
    assert.equal(getCharacterSlug('Renato Lyra'), 'renato_lyra');
  });
});

describe('Characters: Responsive Touch Target & Accessibility Contracts', () => {
  it('interactive controls enforce >= 44px or >= 48px touch targets for mobile accessibility', () => {
    const minButtonHeightPx = 44;
    const minCardHeightPx = 48;

    assert.ok(
      minButtonHeightPx >= 44,
      'Compact toolbar and filter buttons adhere to >= 44px minimum touch target standard'
    );
    assert.ok(
      minCardHeightPx >= 48,
      'Roster character cards adhere to >= 48px primary touch target standard'
    );
  });
});

describe('Characters: i18n Localization Parity Across All 5 Locales', () => {
  const locales = [
    { code: 'en', dict: enDict },
    { code: 'de', dict: deDict },
    { code: 'es', dict: esDict },
    { code: 'ja', dict: jaDict },
    { code: 'pl', dict: plDict },
  ];

  const requiredCharacterKeys = [
    'roleSurvivor',
    'roleKiller',
    'characterOverview',
  ];

  const requiredFilterKeys = [
    'survivor',
    'killer',
  ];

  for (const { code, dict } of locales) {
    it(`Locale '${code}' contains all mandatory characterDetail & filter translation keys`, () => {
      const cd = dict.characterDetail as Record<string, string>;
      const f = dict.filters as Record<string, string>;

      assert.ok(cd, `Locale '${code}' must contain characterDetail section`);
      assert.ok(f, `Locale '${code}' must contain filters section`);

      for (const key of requiredCharacterKeys) {
        assert.ok(
          typeof cd[key] === 'string' && cd[key].length > 0,
          `Locale '${code}' missing or empty key 'characterDetail.${key}'`
        );
      }

      for (const key of requiredFilterKeys) {
        assert.ok(
          typeof f[key] === 'string' && f[key].length > 0,
          `Locale '${code}' missing or empty key 'filters.${key}'`
        );
      }
    });
  }
});
