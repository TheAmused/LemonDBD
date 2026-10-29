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

  it('ID, Please sits in the killer, survivor and combined tabs with its own artwork per side', () => {
    const killer = getKillerStreakPanels(enDict).find((p) => p.id === 'id-please');
    const survivor = getSurvivorStreakPanels(enDict).find((p) => p.id === 'id-please');
    const combined = getChallengeStreakPanels(enDict).find((p) => p.id === 'id-please');
    for (const panel of [killer, survivor, combined]) {
      assert.ok(panel, 'every streak tab must list ID, Please');
      assert.equal(panel.creator, 'TheAmused');
      assert.equal(panel.comingSoon, undefined);
    }
    assert.equal(killer?.image, '/images/streaks/id-please/k0.webp');
    assert.equal(survivor?.image, '/images/streaks/id-please/s0.webp');
    assert.equal(combined?.image, '/images/streaks/id-please/s0.webp');
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




