// frontend/src/__tests__/unit/minigameStorageAndExport.test.ts
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCustomChallenges,
  saveCustomChallenge,
  deleteCustomChallenge,
  getChallengeProgress,
  saveChallengeProgress,
  clearChallengeProgress,
  getDailyStreak,
  recordDailyCompletion,
  recordDailyLoss,
} from '@/utils/minigames/storage';

import { importChallengeFromJson } from '@/utils/minigames/jsonExportImport';
import type { ChallengeDefinition, ChallengeProgress } from '@/types/minigame';

const memory: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => memory[k] ?? null,
  setItem: (k: string, v: string) => {
    memory[k] = String(v);
  },
  removeItem: (k: string) => {
    delete memory[k];
  },
  clear: () => Object.keys(memory).forEach((k) => delete memory[k]),
  key: (i: number) => Object.keys(memory)[i] ?? null,
  get length() {
    return Object.keys(memory).length;
  },
} as Storage;

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k]);
});

describe('minigame local storage', () => {
  it('saves, retrieves, and deletes custom challenges', () => {
    assert.deepEqual(getCustomChallenges(), []);

    const challenge: ChallengeDefinition = {
      title: 'My Custom Gauntlet',
      description: 'A test gauntlet',
      game_mode: 'custom',
      rounds: [
        { round_number: 1, mode: 'realm_guesser', target_id: 1 },
        { round_number: 2, mode: 'classic_character', target_id: 14, target_type: 'killer' },
      ],
    };

    const saved = saveCustomChallenge(challenge);
    assert.ok(saved.id);
    assert.equal(saved.title, 'My Custom Gauntlet');

    const list = getCustomChallenges();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, saved.id);

    deleteCustomChallenge(saved.id!);
    assert.equal(getCustomChallenges().length, 0);
  });

  it('manages challenge progress state', () => {
    const challengeId = 'test_challenge_123';
    assert.equal(getChallengeProgress(challengeId), null);

    const progress: ChallengeProgress = {
      challengeId,
      currentRoundIndex: 0,
      roundGuesses: {},
      roundStatus: { 0: 'in_progress' },
      isFinished: false,
      won: false,
      startedAt: Date.now(),
    };

    saveChallengeProgress(progress);
    const retrieved = getChallengeProgress(challengeId);
    assert.ok(retrieved);
    assert.equal(retrieved.challengeId, challengeId);
    assert.equal(retrieved.currentRoundIndex, 0);

    clearChallengeProgress(challengeId);
    assert.equal(getChallengeProgress(challengeId), null);
  });

  it('tracks daily completion streak correctly', () => {
    const initial = getDailyStreak();
    assert.equal(initial.currentStreak, 0);
    assert.equal(initial.maxStreak, 0);

    // Day 1 completion
    const day1 = recordDailyCompletion('2026-09-28');
    assert.equal(day1.currentStreak, 1);
    assert.equal(day1.maxStreak, 1);
    assert.equal(day1.lastCompletedDate, '2026-09-28');

    // Duplicate completion on same day does not advance streak
    const day1Repeat = recordDailyCompletion('2026-09-28');
    assert.equal(day1Repeat.currentStreak, 1);

    // Consecutive Day 2 advances streak
    const day2 = recordDailyCompletion('2026-09-29');
    assert.equal(day2.currentStreak, 2);
    assert.equal(day2.maxStreak, 2);

    // Skipped day resets current streak to 1
    const day4 = recordDailyCompletion('2026-10-02');
    assert.equal(day4.currentStreak, 1);
    assert.equal(day4.maxStreak, 2); // max streak preserved

    // Defeat or surrender resets current streak to 0 while preserving max streak
    const loss = recordDailyLoss('2026-10-03');
    assert.equal(loss.currentStreak, 0);
    assert.equal(loss.maxStreak, 2);
    assert.equal(loss.lastCompletedDate, '2026-10-03');
  });
});


describe('minigame JSON import validation', () => {
  it('imports valid custom challenge JSON', () => {
    const rawJson = JSON.stringify({
      lemondbd_version: '1.0',
      type: 'minigame_challenge',
      challenge: {
        title: 'Fog Explorer',
        description: 'Test realm and power',
        game_mode: 'custom',
        rounds: [
          { mode: 'realm_guesser', target_id: 2, max_attempts: 5 },
          { mode: 'killer_power', target_id: 1, max_attempts: 6 },
        ],
      },
    });

    const parsed = importChallengeFromJson(rawJson);
    assert.equal(parsed.title, 'Fog Explorer');
    assert.equal(parsed.rounds.length, 2);
    assert.equal(parsed.rounds[0].mode, 'realm_guesser');
    assert.equal(parsed.rounds[0].max_attempts, 5);
  });

  it('rejects invalid JSON or unsupported modes', () => {
    assert.throws(() => importChallengeFromJson('not valid json'), /Invalid JSON format/);
    assert.throws(
      () =>
        importChallengeFromJson(
          JSON.stringify({
            challenge: { title: 'Broken', rounds: [] },
          })
        ),
      /Challenge must contain at least one round/
    );
    assert.throws(
      () =>
        importChallengeFromJson(
          JSON.stringify({
            challenge: {
              title: 'Unknown Mode',
              rounds: [{ mode: 'unsupported_mode_xyz' }],
            },
          })
        ),
      /has unsupported mode/
    );
  });
});
