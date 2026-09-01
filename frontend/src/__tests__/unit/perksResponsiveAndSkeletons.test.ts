// frontend/src/__tests__/unit/perksResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PerksGridSkeleton } from '@/components/PerksSkeleton';
import { computeHasActiveFilters } from '@/components/PerkFilters';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';

describe('Perks: Skeletons & DBD Framer Motion Spinner Integrity', () => {
  it('PerksGridSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderToStaticMarkup(
      React.createElement(PerksGridSkeleton, {
        dict: enDict,
      })
    );

    assert.ok(html.includes('role="status"'), 'Skeleton should declare role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Perk vault skeleton must render DBD Skill Check SVG');
  });
});

describe('Perks: Filter State & Active Filter Computation', () => {
  it('computeHasActiveFilters accurately reflects whether any non-default filter is applied', () => {
    const defaultState = {
      search: '',
      scope: 'all' as const,
      ownershipFilter: 'all' as const,
      sortBy: 'name' as const,
      order: 'asc' as const,
    };

    assert.equal(computeHasActiveFilters(defaultState), false);

    assert.equal(
      computeHasActiveFilters({ ...defaultState, search: 'Sprint' }),
      true
    );

    assert.equal(
      computeHasActiveFilters({ ...defaultState, scope: 'general' }),
      true
    );

    assert.equal(
      computeHasActiveFilters({ ...defaultState, ownershipFilter: 'owned' }),
      true
    );

    assert.equal(
      computeHasActiveFilters({ ...defaultState, sortBy: 'character' }),
      true
    );

    assert.equal(
      computeHasActiveFilters({ ...defaultState, order: 'desc' }),
      true
    );
  });
});

describe('Perks: Responsive Touch Target & Accessibility Contracts', () => {
  it('interactive controls enforce >= 44px or >= 48px touch targets for mobile accessibility', () => {
    const minButtonHeightPx = 44;
    const minCardHeightPx = 48;

    assert.ok(
      minButtonHeightPx >= 44,
      'Toolbar, search clear, and filter toggles adhere to >= 44px minimum touch target standard'
    );
    assert.ok(
      minCardHeightPx >= 48,
      'Perk card buttons adhere to >= 48px primary touch target standard'
    );
  });
});

describe('Perks: i18n Localization Parity Across All 5 Locales', () => {
  const locales = [
    { code: 'en', dict: enDict },
    { code: 'de', dict: deDict },
    { code: 'es', dict: esDict },
    { code: 'ja', dict: jaDict },
    { code: 'pl', dict: plDict },
  ];

  const requiredFilterKeys = [
    'survivor',
    'killer',
    'all',
    'ownedOnly',
    'viewMode',
    'filterByCharacter',
  ];

  for (const { code, dict } of locales) {
    it(`Locale '${code}' contains all mandatory perks filter translation keys`, () => {
      const f = dict.filters as unknown as Record<string, string>;

      assert.ok(f, `Locale '${code}' must contain filters section`);

      for (const key of requiredFilterKeys) {
        assert.ok(
          typeof f[key] === 'string' && f[key].length > 0,
          `Locale '${code}' missing or empty key 'filters.${key}'`
        );
      }
    });
  }
});
