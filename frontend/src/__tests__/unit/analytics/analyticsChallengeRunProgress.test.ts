// frontend/src/__tests__/unit/analytics/analyticsChallengeRunProgress.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaosProgress,
  gauntletProgress,
  historyProgress,
  idPleaseProgress,
  pageStreakProgress,
} from '@/components/streaks/challengeRunProgress';

describe('gauntletProgress and chaosProgress', () => {
  const streakRun = { attempts: 2, attempt_matches: 4, current_streak: 7, last_checkpoint_streak: 5, status: 'in_progress' };

  it('number the attempt in play after the failed ones and read the streak and checkpoint as they are', () => {
    assert.deepEqual(gauntletProgress({ ...streakRun, owned_characters: ['a', 'b', 'c'] }), {
      attempt: 3,
      attemptMatches: 4,
      streak: 7,
      checkpoint: 5,
      completed: false,
      roster: 3,
    });
    assert.deepEqual(chaosProgress({ ...streakRun, owned_killers: ['a', 'b'] }).roster, 2);
  });

  it('mark a completed run', () => {
    assert.equal(gauntletProgress({ ...streakRun, status: 'completed', owned_characters: [] }).completed, true);
    assert.equal(chaosProgress({ ...streakRun, status: 'completed', owned_killers: [] }).completed, true);
  });
});

describe('historyProgress', () => {
  const run = {
    attempts: 0,
    attempt_matches: 0,
    total_killers_beaten: 12,
    mode: 'medium' as const,
    checkpoint_row_index: 2,
    row_size: 5,
    status: 'in_progress',
    total_owned_killers: 40,
  };

  it('counts killers beaten as the streak and the cleared rows as the checkpoint, in killers', () => {
    assert.deepEqual(historyProgress(run), {
      attempt: 1,
      attemptMatches: 0,
      streak: 12,
      checkpoint: 10,
      completed: false,
      roster: 40,
    });
  });

  it('has no checkpoints in Hell', () => {
    assert.equal(historyProgress({ ...run, mode: 'hell' }).checkpoint, 0);
  });
});

describe('pageStreakProgress', () => {
  it('counts the pages cleared, so page 1 is a streak of 0, and has no checkpoints', () => {
    const run = { attempts: 1, attempt_matches: 3, current_page: 1, status: 'in_progress' as const, page_count: 12 };
    assert.deepEqual(pageStreakProgress(run), {
      attempt: 2,
      attemptMatches: 3,
      streak: 0,
      checkpoint: 0,
      completed: false,
      roster: 12,
    });
    assert.equal(pageStreakProgress({ ...run, current_page: 5 }).streak, 4);
  });
});

describe('idPleaseProgress', () => {
  it('treats the badge as the completion and reports no roster', () => {
    const run = { attempts: 0, attempt_matches: 2, current_streak: 4, last_checkpoint_streak: 0, badge_earned: true };
    const progress = idPleaseProgress(run);
    assert.equal(progress.completed, true);
    assert.equal('roster' in progress, false);
    assert.equal(idPleaseProgress({ ...run, badge_earned: false }).completed, false);
  });
});
