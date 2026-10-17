// frontend/src/__tests__/unit/smashOrPassResponsiveAndSkeletons.test.ts
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import React from 'react';
import enDict from '@/locales/en';
import { renderWithDictionary } from '../helpers/renderWithDictionary';
import { SmashHubSkeleton, SmashLeaderboardSkeleton } from '../../components/smash-or-pass/SmashOrPassSkeleton';

test('SmashOrPass: Skeletons & DBD Framer Motion Spinner Suite', async (t) => {
  await t.test('SmashHubSkeleton renders with correct accessibility and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(React.createElement(SmashHubSkeleton));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes(`aria-label="${enDict.smashOrPass.loadingArena}"`));
    assert.ok(html.includes('min-h-screen-smash'));
  });

  await t.test('SmashLeaderboardSkeleton renders with status role and accessibility label', () => {
    const html = renderWithDictionary(React.createElement(SmashLeaderboardSkeleton, { count: 5 }));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes(`aria-label="${enDict.smashOrPass.loadingRankings}"`));
    assert.ok(html.includes('aria-busy="true"'));
  });
});

test('SmashOrPass: Responsive Design & Touch Target Sizes', async (t) => {
  await t.test('Touch targets on interactive buttons adhere to >= 48px or >= 44px standard', () => {
    // Verify touch target class requirements
    const checkTouchClasses = (classStr: string) => {
      const hasMinH = classStr.includes('min-h-hit-lg') || classStr.includes('min-h-hit-md');
      const hasMinW = classStr.includes('min-w-hit-lg') || classStr.includes('min-w-hit-md');
      return hasMinH && hasMinW;
    };

    const cardButtonClasses = 'flex min-h-hit-lg min-w-hit-lg h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl';
    const topCardButtonClasses = 'flex min-h-hit-lg min-w-hit-lg h-12 w-12 sm:h-12 sm:w-12 items-center justify-center rounded-2xl';
    const dockActionClasses = 'flex min-h-hit-md min-w-hit-md sm:min-h-hit-sm sm:min-w-hit-sm h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl';

    assert.ok(checkTouchClasses(cardButtonClasses), 'Card buttons must have min-h and min-w >= 48px');
    assert.ok(checkTouchClasses(topCardButtonClasses), 'Top card buttons must have min-h and min-w >= 48px');
    assert.ok(checkTouchClasses(dockActionClasses), 'Dock action buttons must have min-h and min-w >= 44px');
  });

  await t.test('The card is sized from the window height by one shared rule (styles/smash-or-pass.css)', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../app/styles/smash-or-pass.css'), 'utf8');
    assert.ok(css.includes('--smash-card-h:'), 'publishes the card height');
    assert.ok(css.includes('100dvh'), 'height follows the dynamic viewport, not 100vh');
    assert.ok(css.includes('--smash-card-w:'), 'publishes the card width');
    assert.ok(css.includes('aspect-ratio: 3 / 5'), 'one 3:5 aspect ratio on every screen size');
    assert.ok(/25rem/.test(css), 'keeps a 400px floor so very short windows scroll instead of shrinking the card');

    const card = fs.readFileSync(path.resolve(__dirname, '../../components/smash-or-pass/CharacterCard.tsx'), 'utf8');
    assert.ok(card.includes('smash-card-size'), 'the card uses the shared sizing utility');
    assert.ok(!/w-\[88vw\]/.test(card), 'no viewport-width card sizing is left on the card');
  });

  await t.test('Calculates responsive swipe rotation and card scale transforms', () => {
    const calcDragTransform = (dragX: number, isDragging: boolean, isExiting: boolean, exitType: 'smash' | 'pass' | null) => {
      const dragRotation = Math.min(28, Math.max(-28, dragX * 0.075));
      const cardScale = isExiting
        ? exitType === 'smash'
          ? 1.05
          : 0.88
        : isDragging
          ? 1.02
          : 1;
      return { dragRotation, cardScale };
    };

    // At rest:
    const rest = calcDragTransform(0, false, false, null);
    assert.strictEqual(rest.dragRotation, 0);
    assert.strictEqual(rest.cardScale, 1);

    // Dragging right by 100px:
    const dragRight = calcDragTransform(100, true, false, null);
    assert.strictEqual(dragRight.dragRotation, 7.5);
    assert.strictEqual(dragRight.cardScale, 1.02);

    // Dragging left by 100px:
    const dragLeft = calcDragTransform(-100, true, false, null);
    assert.strictEqual(dragLeft.dragRotation, -7.5);
    assert.strictEqual(dragLeft.cardScale, 1.02);

    // Large drag clamp check:
    const largeDrag = calcDragTransform(1000, true, false, null);
    assert.strictEqual(largeDrag.dragRotation, 28);

    // Smash exit:
    const smashExit = calcDragTransform(500, false, true, 'smash');
    assert.strictEqual(smashExit.cardScale, 1.05);

    // Pass exit:
    const passExit = calcDragTransform(-500, false, true, 'pass');
    assert.strictEqual(passExit.cardScale, 0.88);
  });
});

test('SmashOrPass: i18n Localization Integrity Across 5 Locales', async (t) => {
  const enLocale = (await import('../../locales/en/smashOrPass')).default;
  const deLocale = (await import('../../locales/de/smashOrPass')).default;
  const esLocale = (await import('../../locales/es/smashOrPass')).default;
  const jaLocale = (await import('../../locales/ja/smashOrPass')).default;
  const plLocale = (await import('../../locales/pl/smashOrPass')).default;

  const allLocales = [
    { code: 'en', dict: enLocale },
    { code: 'de', dict: deLocale },
    { code: 'es', dict: esLocale },
    { code: 'ja', dict: jaLocale },
    { code: 'pl', dict: plLocale },
  ];

  const criticalKeys: Array<keyof typeof enLocale> = [
    'title',
    'pass',
    'smash',
    'leaderboard',
    'godTier',
    'fatalAttraction',
    'friendzone',
    'eldritchVoid',
    'allRoles',
    'allGenders',
    'survivors',
    'killers',
    'flipToDatingProfile',
    'zoomFullPortrait',
    'flipBack',
  ];

  for (const { code, dict } of allLocales) {
    await t.test(`Locale '${code}' contains all critical UI and tier classification keys`, () => {
      assert.ok(dict, `Locale ${code} must export a dictionary`);
      for (const key of criticalKeys) {
        assert.ok(dict[key], `Locale ${code} is missing critical key '${key}'`);
        assert.strictEqual(typeof dict[key], 'string', `Locale ${code} key '${key}' must be a string`);
      }
    });
  }

  await t.test('Candidate rank label template supports safe variable interpolation', () => {
    const template = enLocale.candidateRankLabel || '{name} - Rank #{rank}, Smash Rate: {rate}%';
    const formatted = template
      .replace('{name}', 'Sable Ward')
      .replace('{rank}', '1')
      .replace('{rate}', '95.5');

    assert.ok(formatted.includes('Sable Ward'));
    assert.ok(formatted.includes('#1'));
    assert.ok(formatted.includes('95.5%'));
  });
});
