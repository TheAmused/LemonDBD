// frontend/src/__tests__/unit/minigames/minigameStorageAndExport.test.ts
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
  wonDailyOn,
} from '@/utils/minigames/storage';

import { MINIGAME_IMPORT_LIMITS, importChallengeFromJson } from '@/utils/minigames/jsonExportImport';
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
    assert.equal(wonDailyOn(loss, '2026-10-03'), false, 'a lost day is not "completed"');
  });

  it('the first daily finished on a day decides it (another mode the same day changes nothing)', () => {
    recordDailyCompletion('2026-11-01');
    const won = recordDailyCompletion('2026-11-02');
    assert.equal(won.currentStreak, 2);
    const laterLoss = recordDailyLoss('2026-11-02');
    assert.equal(laterLoss.currentStreak, 2, 'a loss in a second mode must not zero a day already won');
    assert.equal(wonDailyOn(laterLoss, '2026-11-02'), true);
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

  it('imports challenge and preserves valid _manifest', () => {
    const mockManifest = {
      content_type: 'minigame',
      content_hash: 'c'.repeat(64),
      author_id: 10,
      author_login: 'trapper',
      signature: 'd'.repeat(64),
      created_at: '2026-10-14T12:00:00Z',
    };

    const rawJson = JSON.stringify({
      lemondbd_version: '1.0',
      type: 'minigame_challenge',
      _manifest: mockManifest,
      challenge: {
        title: 'Manifest Gauntlet',
        game_mode: 'custom',
        rounds: [{ mode: 'realm_guesser', target_id: 2 }],
      },
    });

    const parsed = importChallengeFromJson(rawJson);
    assert.deepEqual(parsed._manifest, mockManifest);

    const saved = saveCustomChallenge(parsed);
    assert.deepEqual(saved._manifest, mockManifest);
    const retrieved = getCustomChallenges();
    assert.deepEqual(retrieved[0]._manifest, mockManifest);
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

// 2026-10-19 review L4: an imported trial is untrusted input.
describe('minigame import caps', () => {
  const wrap = (challenge: Record<string, unknown>) => JSON.stringify({ challenge });
  const round = (extra: Record<string, unknown> = {}) => ({ mode: 'classic_character', target_id: 1, ...extra });

  it('refuses oversized files, too many rounds and runaway attempts', () => {
    assert.throws(() => importChallengeFromJson('x'.repeat(MINIGAME_IMPORT_LIMITS.maxPayloadChars + 1)), /too large/);
    assert.throws(() => importChallengeFromJson(wrap({ title: 't', rounds: Array.from({ length: 21 }, () => round()) })), /at most 20 rounds/);
    assert.throws(() => importChallengeFromJson(wrap({ title: 't', rounds: [round({ max_attempts: 1e9 })] })), /too many attempts/);
    assert.throws(() => importChallengeFromJson(wrap({ title: 't', description: 'd'.repeat(1001), rounds: [round()] })), /too long/);
  });

  it('only lets audio point at the site own stream', () => {
    assert.throws(
      () => importChallengeFromJson(wrap({ title: 't', rounds: [round({ mode: 'terror_radius', custom_data: { audio_endpoint: 'https://evil.example/ping.mp3' } })] })),
      /other than LemonDBD/
    );
    const ok = importChallengeFromJson(
      wrap({ title: 't', rounds: [round({ mode: 'terror_radius', custom_data: { audio_endpoint: '/api/v1/minigames/audio/terror_radius/7' } })] })
    );
    assert.equal(ok.rounds[0].custom_data?.audio_endpoint, '/api/v1/minigames/audio/terror_radius/7');
  });

  it('refuses non-text custom data instead of rewriting it (rewriting would break the account mark)', () => {
    assert.throws(() => importChallengeFromJson(wrap({ title: 't', rounds: [round({ custom_data: { quote: { nested: true } } })] })), /invalid "quote"/);
    const ok = importChallengeFromJson(wrap({ title: 't', rounds: [round({ custom_data: { quote: 'Hi', hints: ['a'] } })] }));
    assert.deepEqual(ok.rounds[0].custom_data, { quote: 'Hi', hints: ['a'] });
  });
});
