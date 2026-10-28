// frontend/src/__tests__/unit/smash/smashOrPassResponsiveAndSkeletons.test.ts
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import React from 'react';
import enDict from '@/locales/en';
import { renderWithDictionary } from '../../helpers/renderWithDictionary';
import { SmashHubSkeleton, SmashLeaderboardSkeleton } from '../../../components/smash-or-pass/SmashOrPassSkeleton';

test('SmashOrPass: Skeletons & DBD Framer Motion Spinner Suite', async (t) => {
  await t.test('SmashHubSkeleton renders with correct accessibility and DBD Skill Check Spinner', () => {
    const html = renderWithDictionary(React.createElement(SmashHubSkeleton));
    assert.ok(html.includes('<output'));
    assert.ok(html.includes('aria-busy="true"'));
    assert.ok(html.includes(`aria-label="${enDict.smashOrPass.loadingArena}"`));
    assert.ok(html.includes('min-h-screen-smash'));
  });

  await t.test('SmashLeaderboardSkeleton renders with status role and accessibility label', () => {
    const html = renderWithDictionary(React.createElement(SmashLeaderboardSkeleton, { count: 5 }));
    assert.ok(html.includes('<output'));
    assert.ok(html.includes(`aria-label="${enDict.smashOrPass.loadingRankings}"`));
    assert.ok(html.includes('aria-busy="true"'));
  });
});




