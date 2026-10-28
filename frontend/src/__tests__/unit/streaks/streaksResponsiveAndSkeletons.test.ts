// frontend/src/__tests__/unit/streaks/streaksResponsiveAndSkeletons.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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




