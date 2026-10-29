// frontend/src/__tests__/unit/streaks/idPlease.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ID_PLEASE_BADGE_STREAK,
  ID_PLEASE_DIFFICULTIES,
  ID_PLEASE_LANES,
  ID_PLEASE_MODE_BY_LANE,
  idPleaseLaneForRole,
  idPleaseLaneSide,
  parseIdPleaseDifficulty,
  type IdPleaseDifficultyEligibility,
} from '@/types/idPleaseStreak';
import {
  ID_PLEASE_DIFFICULTY_TONE,
  idPleaseCardImage,
  idPleaseDifficultyImage,
} from '@/components/streaks/id-please/idPleaseAssets';
import { idPleaseNeeds } from '@/components/streaks/id-please/idPleaseNeeds';
import { getTrophyShelves } from '@/components/achievements/shelves';
import { everyNthCheckpoint } from '@/utils/challengeCheckpoints';
import { ID_PLEASE_DIFFICULTY_ORDER, isHardestTierCompleted } from '@/utils/challengeTierCompletion';
import enDict from '@/locales/en';
import deDict from '@/locales/de';
import esDict from '@/locales/es';
import jaDict from '@/locales/ja';
import plDict from '@/locales/pl';
import type { Dictionary } from '@/locales/types';
import { StreakApiError } from '@/services/streakApiClient';

const requirement = (charsHave: number, charsNeed: number, perksHave: number, perksNeed: number) => ({
  characters: { have: charsHave, need: charsNeed },
  perks: { have: perksHave, need: perksNeed },
});

describe('ID, Please: difficulties', () => {
  it('parses a difficulty and falls back to Milestones', () => {
    assert.equal(parseIdPleaseDifficulty('hardcore'), 'hardcore');
    assert.equal(parseIdPleaseDifficulty('hardcore_plus'), 'hardcore_plus');
    assert.equal(parseIdPleaseDifficulty('nonsense'), 'milestones');
    assert.equal(parseIdPleaseDifficulty(null), 'milestones');
  });

  it('keeps the badge streaks, checkpoints and the card trophy consistent', () => {
    assert.deepEqual(ID_PLEASE_BADGE_STREAK, { milestones: 50, hardcore: 30, hardcore_plus: 25 });
    assert.deepEqual(everyNthCheckpoint(10, ID_PLEASE_BADGE_STREAK.milestones), [10, 20, 30, 40]);
    assert.deepEqual(everyNthCheckpoint(0, ID_PLEASE_BADGE_STREAK.hardcore), []);
    assert.deepEqual([...ID_PLEASE_DIFFICULTY_ORDER], [...ID_PLEASE_DIFFICULTIES]);
    // The badges are independent: only Hardcore+ earns the card's trophy.
    assert.equal(isHardestTierCompleted(ID_PLEASE_DIFFICULTY_ORDER, ['milestones', 'hardcore']), false);
    assert.equal(isHardestTierCompleted(ID_PLEASE_DIFFICULTY_ORDER, ['hardcore_plus']), true);
  });
});

describe('ID, Please: artwork', () => {
  it('names the artwork by side and difficulty (1 Milestones, 2 Hardcore, 3 Hardcore+)', () => {
    assert.equal(idPleaseDifficultyImage('survivor', 'milestones'), '/images/streaks/id-please/s1.webp');
    assert.equal(idPleaseDifficultyImage('killer', 'hardcore'), '/images/streaks/id-please/k2.webp');
    assert.equal(idPleaseDifficultyImage('killer', 'hardcore_plus'), '/images/streaks/id-please/k3.webp');
  });

  it('shows the killer card art on the killer tab and the survivor art everywhere else', () => {
    assert.equal(idPleaseCardImage('killer'), '/images/streaks/id-please/k0.webp');
    assert.equal(idPleaseCardImage('survivor'), '/images/streaks/id-please/s0.webp');
    assert.equal(idPleaseCardImage('challenge'), '/images/streaks/id-please/s0.webp');
  });

  it('gives each tab its own lane, with its own side and its own backend mode', () => {
    assert.deepEqual(['killer', 'survivor', 'challenge'].map(idPleaseLaneForRole), ['killer', 'survivor', 'mixed']);
    assert.deepEqual(ID_PLEASE_LANES.map(idPleaseLaneSide), [null, 'survivor', 'killer']);
    assert.deepEqual(ID_PLEASE_LANES.map((lane) => ID_PLEASE_MODE_BY_LANE[lane]), ['id_please', 'id_please_survivor', 'id_please_killer']);
  });

  it('gives every difficulty a tone', () => {
    for (const difficulty of ID_PLEASE_DIFFICULTIES) assert.ok(ID_PLEASE_DIFFICULTY_TONE[difficulty]);
  });
});

describe('ID, Please: what a locked difficulty needs', () => {
  const eligibility = (killer: ReturnType<typeof requirement>, survivor: ReturnType<typeof requirement>): IdPleaseDifficultyEligibility => ({
    met: false,
    killer,
    survivor,
  });

  it('is empty when both sides meet the minimum', () => {
    assert.deepEqual(idPleaseNeeds(enDict.streaks, eligibility(requirement(30, 20, 100, 77), requirement(30, 25, 100, 92))), []);
  });

  it('names each shortfall on its side', () => {
    const lines = idPleaseNeeds(enDict.streaks, eligibility(requirement(10, 20, 100, 77), requirement(30, 25, 50, 92)));
    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes(enDict.streaks.killer) && lines[0].includes('20') && lines[0].includes('10'));
    assert.ok(lines[1].includes(enDict.streaks.survivor) && lines[1].includes('92') && lines[1].includes('50'));
  });
});

describe('ID, Please: copy and shelves', () => {
  const locales: Array<[string, Dictionary]> = [['en', enDict], ['de', deDict], ['es', esDict], ['ja', jaDict], ['pl', plDict]];

  it('has the same placeholders in every language', () => {
    const keys = Object.keys(enDict.streaks).filter((key) => key.startsWith('idPlease')) as Array<keyof typeof enDict.streaks>;
    assert.ok(keys.length > 40);
    for (const [name, dict] of locales) {
      for (const key of keys) {
        const wanted = (enDict.streaks[key].match(/\{\w+\}/g) ?? []).sort();
        const got = (dict.streaks[key].match(/\{\w+\}/g) ?? []).sort();
        assert.deepEqual(got, wanted, `${name}.streaks.${key}`);
      }
    }
  });

  it('lists a trophy shelf per lane: a streak in the mixed one, every character in the others', () => {
    const shelves = getTrophyShelves(enDict);
    for (const lane of ['survivor', 'killer'] as const) {
      const shelf = shelves.find((s) => s.id === `id_please_${lane}`);
      assert.ok(shelf);
      assert.deepEqual(
        shelf.tiers.map((tier) => tier.id),
        [`id_please_${lane}_milestones`, `id_please_${lane}_hardcore`, `id_please_${lane}_hardcore_plus`]
      );
      assert.ok(/win with every/i.test(shelf.tiers[0].hoverText?.owned ?? ''));
      // Hardcore and Hardcore+ earn the badge at the same streak as the mixed lane, in every lane.
      assert.ok(/30/.test(shelf.tiers[1].hoverText?.owned ?? ''));
      assert.ok(/25/.test(shelf.tiers[2].hoverText?.owned ?? ''));
    }
  });

  it('lists a trophy tier per difficulty with its own streak in the hover text', () => {
    const shelf = getTrophyShelves(enDict).find((s) => s.id === 'id_please');
    assert.ok(shelf);
    assert.deepEqual(
      shelf.tiers.map((tier) => tier.id),
      ['id_please_milestones', 'id_please_hardcore', 'id_please_hardcore_plus']
    );
    assert.ok(shelf.tiers[0].hoverText?.owned.includes('50'));
    assert.ok(shelf.tiers[1].hoverText?.owned.includes('30'));
    assert.ok(shelf.tiers[2].hoverText?.owned.includes('25'));
  });
});

describe('ID, Please: API errors', () => {
  it('carries the status, code and body of a refused request', () => {
    const error = new StreakApiError('stale', 409, 'stale_match', { run: { id: 1 } });
    assert.equal(error.status, 409);
    assert.equal(error.code, 'stale_match');
    assert.deepEqual(error.body, { run: { id: 1 } });
    assert.ok(error instanceof Error);
  });
});
