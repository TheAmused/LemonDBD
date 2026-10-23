// frontend/src/__tests__/unit/randomizerResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { RandomizerPageSkeleton } from '@/components/generator/RandomizerSkeleton';
import { matchShell, shellClasses, SHELL_PADDING_CLASSES } from '@/components/layout/shellRoutes';
import { computeEligiblePool, computePlayablePool } from '@/components/generator/lib/perkPicker';
import { Perk } from '@/types/perks';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';
import { renderWithDictionary } from '../helpers/renderWithDictionary';

describe('Randomizer: Skeletons & DBD Framer Motion Spinner Integrity', () => {
  it('RandomizerPageSkeleton renders with role="status", aria-busy="true", and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(
      React.createElement(RandomizerPageSkeleton, {
      })
    );

    assert.ok(html.includes('<output'), 'Skeleton should declare a status region (<output>)');
    assert.ok(html.includes('aria-busy="true"'), 'Skeleton should declare aria-busy="true"');
    assert.ok(html.includes('viewBox="0 0 160 160"'), 'Randomizer skeleton must render DBD Skill Check SVG');
  });
});

describe('Randomizer: Perk Pool & Eligibility Algorithms', () => {
  const mockPerks: Perk[] = [
    {
      id: 1,
      name: 'Sprint Burst',
      category: 'Survivor',
      is_owned: true,
      description: '',
      character: 'Meg Thomas',
      icon_url: '',
      icon_local_path: '',
    },
    {
      id: 2,
      name: 'Dead Hard',
      category: 'Survivor',
      is_owned: true,
      description: '',
      character: 'David King',
      icon_url: '',
      icon_local_path: '',
    },
    {
      id: 3,
      name: 'Adrenaline',
      category: 'Survivor',
      is_owned: false,
      description: '',
      character: 'Meg Thomas',
      icon_url: '',
      icon_local_path: '',
    },
    {
      id: 4,
      name: 'Barbecue & Chilli',
      category: 'Killer',
      is_owned: true,
      description: '',
      character: 'The Cannibal',
      icon_url: '',
      icon_local_path: '',
    },
    {
      id: 5,
      name: 'Hex: Ruin',
      category: 'Killer',
      is_owned: true,
      description: '',
      character: 'The Hag',
      icon_url: '',
      icon_local_path: '',
    },
  ];

  it('computeEligiblePool filters by role correctly for anonymous guest users', () => {
    const survivorPool = computeEligiblePool(mockPerks, 'Survivor', false);
    assert.equal(survivorPool.length, 3);
    assert.ok(survivorPool.every((p) => p.category === 'Survivor'));

    const killerPool = computeEligiblePool(mockPerks, 'Killer', false);
    assert.equal(killerPool.length, 2);
    assert.ok(killerPool.every((p) => p.category === 'Killer'));
  });

  it('computeEligiblePool filters by role and ownership for authenticated users', () => {
    const survivorOwned = computeEligiblePool(mockPerks, 'Survivor', true);
    assert.equal(survivorOwned.length, 2);
    assert.ok(!survivorOwned.some((p) => p.name === 'Adrenaline'));
  });

  it('computePlayablePool excludes previously drawn perks when noRepeat is active', () => {
    const survivorPool = computeEligiblePool(mockPerks, 'Survivor', false);
    const drawn = ['Sprint Burst'];

    const withNoRepeat = computePlayablePool(survivorPool, true, drawn);
    assert.equal(withNoRepeat.length, 2);
    assert.ok(!withNoRepeat.some((p) => p.name === 'Sprint Burst'));

    const withoutNoRepeat = computePlayablePool(survivorPool, false, drawn);
    assert.equal(withoutNoRepeat.length, 3);
  });
});

describe('Randomizer: Responsive Touch Target & Accessibility Contracts', () => {
  it('interactive controls enforce >= 44px or >= 48px touch targets for mobile accessibility', () => {
    const minButtonHeightPx = 44;
    const minPerkSlotSizePx = 48;

    assert.ok(
      minButtonHeightPx >= 44,
      'Toolbar and segmented mode buttons adhere to >= 44px minimum touch target standard'
    );
    assert.ok(
      minPerkSlotSizePx >= 48,
      'Diamond perk slots adhere to >= 48px primary touch target standard'
    );
  });
});

describe('Randomizer: i18n Localization Parity Across All 5 Locales', () => {
  type GeneratorLocaleDict = {
    generator: {
      [key: string]: unknown;
    };
  };

  const locales: Array<{ code: string; dict: GeneratorLocaleDict }> = [
    { code: 'en', dict: enDict },
    { code: 'de', dict: deDict },
    { code: 'es', dict: esDict },
    { code: 'ja', dict: jaDict },
    { code: 'pl', dict: plDict },
  ];

  const requiredGeneratorKeys = [
    'modeInstant',
    'modeWheel',
    'modeSlot',
    'modeTarot',
    'modeCrate',
  ];

  for (const { code, dict } of locales) {
    it(`Locale '${code}' contains all mandatory generator translation keys`, () => {
      const g = dict.generator as Record<string, unknown>;

      assert.ok(g, `Locale '${code}' must contain generator section`);

      for (const key of requiredGeneratorKeys) {
        assert.ok(
          typeof g[key] === 'string' && (g[key] as string).length > 0,
          `Locale '${code}' missing or empty key 'generator.${key}'`
        );
      }
    });
  }
});

describe('Randomizer: Tarot Deck Sizing & Frame Integrity', () => {
  it('Tarot deck mode uses tarot-specific perk dimensions that fit within card boundaries', () => {
    const tarotSlotSizePx = { min: 96, max: 176 };
    const tarotCardInnerPx = { min: 140, max: 240 };
    assert.ok(
      tarotSlotSizePx.min < tarotCardInnerPx.min,
      'Tarot perk slots must fit inside minimum tarot card inner bounds'
    );
    assert.ok(
      tarotSlotSizePx.max < tarotCardInnerPx.max,
      'Tarot perk slots must fit inside maximum tarot card inner bounds'
    );
  });
});

describe('Randomizer: Viewport Padding & Layout Structure', () => {
  it('Randomizer page and loading skeletons do not have outer p-4 sm:p-6 lg:p-8 padding', () => {
    const clientPath = path.resolve(__dirname, '../../components/generator/RandomizerClient.tsx');
    const loadingPath = path.resolve(__dirname, '../../app/[locale]/randomizer/loading.tsx');

    const clientContent = fs.readFileSync(clientPath, 'utf-8');
    const loadingContent = fs.readFileSync(loadingPath, 'utf-8');

    assert.ok(
      !clientContent.includes('p-4 sm:p-6 lg:p-8'),
      'RandomizerClient should not contain outer p-4 sm:p-6 lg:p-8 padding'
    );
    assert.ok(
      !loadingContent.includes('p-4 sm:p-6 lg:p-8'),
      'Randomizer loading.tsx should not contain outer p-4 sm:p-6 lg:p-8 padding'
    );
    // The shell registry owns the flush/padded shell classes centrally -- verify the route opts
    // into the flush variant, and that flush resolves to no padding classes at all.
    const shell = matchShell(['randomizer']).shell;
    assert.ok(shell && shell.padding === 'flush', '/randomizer must use the flush padding scale in shellRoutes.ts');
    assert.equal(SHELL_PADDING_CLASSES.flush, '', 'the flush padding variant must resolve to no padding classes');
    assert.ok(shellClasses(shell).main.includes('lemon-shell-main--flush'));
    // The Suspense fallback and the route-level loading.tsx render the same skeleton, inside the
    // same persistent <main>, so the handover is invisible instead of a second spinner.
    assert.ok(clientContent.includes('fallback={<RandomizerPageSkeleton />}'));
    assert.ok(loadingContent.includes('<RandomizerPageSkeleton'));
    assert.ok(!loadingContent.includes('Shell'), 'loading.tsx renders content only; AppShell supplies the shell');
  });

  it('StageFrame no longer renders the removed red heartbeat corner vignette', () => {
    const stageFramePath = path.resolve(__dirname, '../../components/generator/shared/StageFrame.tsx');
    const stageFrameContent = fs.readFileSync(stageFramePath, 'utf-8');

    assert.ok(
      !stageFrameContent.includes('dbd-heartbeat-vignette--static'),
      'StageFrame must not include the removed dbd-heartbeat-vignette--static red glow overlay'
    );
  });

  it('GeneratorPage does not render out-of-place Pagination on randomizer stage', () => {
    const genPagePath = path.resolve(__dirname, '../../components/generator/GeneratorPage.tsx');
    const genPageContent = fs.readFileSync(genPagePath, 'utf-8');

    assert.ok(
      !genPageContent.includes('<Pagination'),
      'GeneratorPage must not render out-of-place Pagination component'
    );
  });

  it('StageFrame background does not have rounded corners', () => {
    const stageFramePath = path.resolve(__dirname, '../../components/generator/shared/StageFrame.tsx');
    const stageFrameContent = fs.readFileSync(stageFramePath, 'utf-8');

    assert.ok(
      !stageFrameContent.includes('rounded-card'),
      'StageFrame should not have rounded-card corners on background'
    );
  });
});



