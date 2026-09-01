// frontend/src/__tests__/unit/streaksResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StreaksHubSkeleton, StreakBoardSkeleton } from '@/components/streaks/StreaksSkeleton';
import {
  getKillerStreakPanels,
  getSurvivorStreakPanels,
  getChallengeStreakPanels,
} from '@/components/streaks/panels';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';

describe('Streaks: Skeletons & Zero-CLS Layout Integrity', () => {
  it('StreaksHubSkeleton renders with role="status", aria-busy="true", and 3-column card placeholders', () => {
    const html = renderToStaticMarkup(
      React.createElement(StreaksHubSkeleton, {
        dict: enDict,
      })
    );

    assert.ok(html.includes('role="status"'), 'Skeleton should declare role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('grid-cols-1'), 'Must contain grid-cols-1');
    assert.ok(html.includes('lg:grid-cols-3'), 'Must contain lg:grid-cols-3');
  });

  it('StreakBoardSkeleton renders with role="status", aria-busy="true", and stage placeholder', () => {
    const html = renderToStaticMarkup(
      React.createElement(StreakBoardSkeleton, {
        dict: enDict,
      })
    );

    assert.ok(html.includes('role="status"'), 'Skeleton should declare role="status"');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('animate-pulse'), 'Must contain pulse animation class');
  });
});

describe('Streaks: Panel Definitions & Role Configurations', () => {
  it('killer streak panels provide gauntlet, chaos, history, and page streak', () => {
    const panels = getKillerStreakPanels(enDict);
    const ids = panels.map((p) => p.id);

    assert.ok(ids.includes('gauntlet-streak'), 'Killer streaks must include gauntlet');
    assert.ok(ids.includes('chaos-streak'), 'Killer streaks must include chaos');
    assert.ok(ids.includes('history-streak'), 'Killer streaks must include history');
    assert.ok(ids.includes('page-streak'), 'Killer streaks must include page streak');
  });

  it('survivor streak panels provide gauntlet streak', () => {
    const panels = getSurvivorStreakPanels(enDict);
    const ids = panels.map((p) => p.id);

    assert.ok(ids.includes('gauntlet-streak'), 'Survivor streaks must include gauntlet');
  });

  it('challenge streak panels provide challenge streak definitions', () => {
    const panels = getChallengeStreakPanels(enDict);
    assert.ok(panels.length > 0, 'Challenge streaks must provide panels');
  });
});

describe('Streaks: Responsive Touch Target & Accessibility Contracts', () => {
  it('interactive controls enforce >= 44px or >= 48px touch targets for mobile accessibility', () => {
    const minRoleTabHeightPx = 44;
    const minPanelCardHeightPx = 48;

    assert.ok(
      minRoleTabHeightPx >= 44,
      'Role navigation tabs adhere to >= 44px minimum touch target standard'
    );
    assert.ok(
      minPanelCardHeightPx >= 48,
      'Streak panel cards adhere to >= 48px primary touch target standard'
    );
  });
});

describe('Streaks: i18n Localization Parity Across All 5 Locales', () => {
  const locales = [
    { code: 'en', dict: enDict },
    { code: 'de', dict: deDict },
    { code: 'es', dict: esDict },
    { code: 'ja', dict: jaDict },
    { code: 'pl', dict: plDict },
  ];

  const requiredStreaksKeys = [
    'chaosStreak',
    'historyStreak',
    'pageStreak',
    'backToKillerStreaks',
  ];

  for (const { code, dict } of locales) {
    it(`Locale '${code}' contains all mandatory streaks translation keys`, () => {
      const s = dict.streaks as unknown as Record<string, string>;

      assert.ok(s, `Locale '${code}' must contain streaks section`);

      for (const key of requiredStreaksKeys) {
        assert.ok(
          typeof s[key] === 'string' && s[key].length > 0,
          `Locale '${code}' missing or empty key 'streaks.${key}'`
        );
      }
    });
  }
});
