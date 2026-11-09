// frontend/src/__tests__/unit/analytics/analyticsChallenges.test.ts
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  challengeFromPath,
  reportAbandon,
  reportAbandonAllKillers,
  reportBoost,
  reportTokens,
  reportChallengeUi,
  reportMatchResult,
  reportModeChange,
  type RunProgress,
} from '@/components/streaks/challengeTracking';
import type { ChallengeTag } from '@/utils/analytics';

type Call = { name: string; data: unknown };
const g = globalThis as { window?: unknown };

const TAG: ChallengeTag = { challenge: 'chaos', role: 'killer', variant: 'medium' };

function progress(overrides: Partial<RunProgress>): RunProgress {
  return { attempt: 1, attemptMatches: 0, streak: 0, checkpoint: 0, completed: false, ...overrides };
}

function record(): Call[] {
  const calls: Call[] = [];
  g.window = { umami: { track: (name: string, data?: unknown) => calls.push({ name, data }) } };
  return calls;
}

describe('reportMatchResult', () => {
  beforeEach(() => {
    delete g.window;
  });
  afterEach(() => {
    delete g.window;
  });

  it('starts the attempt on its first match, with the attempt number and the roster', () => {
    const calls = record();
    const before = progress({ attempt: 3, roster: 41 });
    reportMatchResult(TAG, before, progress({ attempt: 3, attemptMatches: 1, streak: 1, roster: 41 }), 'win');
    assert.deepEqual(calls, [
      { name: 'challenge_start', data: { ...TAG, attempt: 3, roster: 41 } },
      { name: 'challenge_win', data: { ...TAG, streak: 1 } },
    ]);
  });

  it('leaves the roster out for a challenge without one', () => {
    const calls = record();
    reportMatchResult(TAG, progress({}), progress({ attemptMatches: 1, streak: 1 }), 'win');
    assert.deepEqual(calls[0]?.data, { ...TAG, attempt: 1 });
  });

  it('reports just the win for an ordinary win in the middle of an attempt', () => {
    const calls = record();
    reportMatchResult(TAG, progress({ attemptMatches: 4, streak: 4 }), progress({ attemptMatches: 5, streak: 5 }), 'win');
    assert.deepEqual(calls, [{ name: 'challenge_win', data: { ...TAG, streak: 5 } }]);
  });

  it('counts a first match that is lost as both a start and a loss', () => {
    const calls = record();
    // A lost match begins the next attempt at once, so the attempt number moves on and the matches go back to 0.
    reportMatchResult(TAG, progress({ attempt: 1 }), progress({ attempt: 2, attemptMatches: 0 }), 'loss');
    assert.deepEqual(calls.map((c) => c.name), ['challenge_start', 'challenge_loss']);
    assert.deepEqual(calls[1]?.data, { ...TAG, streak: 0 });
  });

  it('reports how far the attempt got when it is lost', () => {
    const calls = record();
    reportMatchResult(TAG, progress({ attemptMatches: 8, streak: 7 }), progress({ attempt: 2, streak: 5, checkpoint: 5 }), 'loss');
    assert.deepEqual(calls, [{ name: 'challenge_loss', data: { ...TAG, streak: 7 } }]);
  });

  it('does not call a loss that was spared a failure (a shield keeps the attempt number)', () => {
    const calls = record();
    reportMatchResult(TAG, progress({ attemptMatches: 8, streak: 7 }), progress({ attemptMatches: 9, streak: 7 }), 'loss');
    assert.deepEqual(calls, []);
  });

  it('reports a checkpoint banked by a win, at the streak it was banked', () => {
    const calls = record();
    reportMatchResult(TAG, progress({ attemptMatches: 4, streak: 4 }), progress({ attemptMatches: 5, streak: 5, checkpoint: 5 }), 'win');
    assert.deepEqual(calls, [
      { name: 'challenge_win', data: { ...TAG, streak: 5 } },
      { name: 'challenge_checkpoint', data: { ...TAG, streak: 5 } },
    ]);
  });

  it('does not report the same checkpoint again on a later win', () => {
    const calls = record();
    reportMatchResult(TAG, progress({ attemptMatches: 5, streak: 5, checkpoint: 5 }), progress({ attemptMatches: 6, streak: 6, checkpoint: 5 }), 'win');
    assert.deepEqual(calls.map((c) => c.name), ['challenge_win']);
  });

  it('reports the completion with the attempts it took, and not as one more checkpoint', () => {
    const calls = record();
    reportMatchResult(
      TAG,
      progress({ attempt: 4, attemptMatches: 9, streak: 9 }),
      // Finishing a run starts its attempt count over, so the number has to come from before the match.
      progress({ attempt: 1, attemptMatches: 10, streak: 10, checkpoint: 10, completed: true }),
      'win'
    );
    assert.deepEqual(calls.map((c) => c.name), ['challenge_win', 'challenge_complete']);
    assert.deepEqual(calls[1]?.data, { ...TAG, attempts: 4 });
  });

  it('reports a completion only once, the way an earned badge keeps the run going', () => {
    const calls = record();
    reportMatchResult(TAG, progress({ attemptMatches: 3, completed: true }), progress({ attemptMatches: 4, completed: true }), 'win');
    assert.deepEqual(calls.map((c) => c.name), ['challenge_win']);
  });
});

describe('reportAbandon', () => {
  beforeEach(() => {
    delete g.window;
  });
  afterEach(() => {
    delete g.window;
  });

  it('reports how far the given up attempt got', () => {
    const calls = record();
    reportAbandon(TAG, progress({ attemptMatches: 6, streak: 5 }));
    assert.deepEqual(calls, [{ name: 'challenge_abandon', data: { ...TAG, streak: 5 } }]);
  });

  it('ignores a reset of an attempt with no match played', () => {
    const calls = record();
    reportAbandon(TAG, progress({ attemptMatches: 0 }));
    assert.deepEqual(calls, []);
  });

  it('ignores a reset of a finished run', () => {
    const calls = record();
    reportAbandon(TAG, progress({ attemptMatches: 10, streak: 10, completed: true }));
    assert.deepEqual(calls, []);
  });
});

describe('reportAbandonAllKillers', () => {
  beforeEach(() => {
    delete g.window;
  });
  afterEach(() => {
    delete g.window;
  });

  it('counts the attempts in progress and the finished runs it gave up, and not the killers never played', () => {
    const calls = record();
    reportAbandonAllKillers([
      { status: 'in_progress' },
      { status: 'in_progress' },
      { status: 'completed' },
      { status: 'not_started' },
    ]);
    assert.deepEqual(calls, [{ name: 'challenge_abandon_all', data: { challenge: 'page_streak', in_progress: 2, completed: 1 } }]);
  });

  it('says nothing when there was nothing to give up', () => {
    const calls = record();
    reportAbandonAllKillers([{ status: 'not_started' }, { status: 'not_started' }]);
    assert.deepEqual(calls, []);
  });
});

describe('reportTokens and reportBoost', () => {
  beforeEach(() => {
    delete g.window;
  });
  afterEach(() => {
    delete g.window;
  });

  const lemon: ChallengeTag = { challenge: 'gauntlet', role: 'killer', variant: 'lemon_killer' };

  it('reports the tokens a win added', () => {
    const calls = record();
    reportTokens(lemon, 3);
    assert.deepEqual(calls, [{ name: 'challenge_tokens', data: { ...lemon, earned: 3 } }]);
  });

  it('reports nothing for a win that added no tokens (the balance was full)', () => {
    const calls = record();
    reportTokens(lemon, 0);
    assert.deepEqual(calls, []);
  });

  it('reports a boost with what it cost', () => {
    const calls = record();
    reportBoost(lemon, 'pick', 6);
    assert.deepEqual(calls, [{ name: 'challenge_boost', data: { ...lemon, boost: 'pick', price: 6 } }]);
  });
});

describe('challengeFromPath', () => {
  it('names the challenge a streaks path belongs to', () => {
    assert.equal(challengeFromPath('/en/streaks/killer/gauntlet-streak'), 'gauntlet');
    assert.equal(challengeFromPath('/pl/streaks/survivor/gauntlet-streak'), 'gauntlet');
    assert.equal(challengeFromPath('/en/streaks/killer/chaos-streak'), 'chaos');
    assert.equal(challengeFromPath('/en/streaks/killer/history-streak'), 'history');
    assert.equal(challengeFromPath('/en/streaks/killer/page-streak'), 'page_streak');
    assert.equal(challengeFromPath('/en/streaks/killer/page-streak/the-trapper'), 'page_streak');
    assert.equal(challengeFromPath('/de/streaks/challenge/id-please'), 'id_please');
  });

  it('knows nothing about the pickers and other pages', () => {
    assert.equal(challengeFromPath('/en/streaks'), null);
    assert.equal(challengeFromPath('/en/streaks/killer'), null);
    assert.equal(challengeFromPath('/en/perks'), null);
    assert.equal(challengeFromPath(null), null);
  });
});

describe('reportChallengeUi and reportModeChange', () => {
  beforeEach(() => {
    delete g.window;
  });
  afterEach(() => {
    delete g.window;
  });

  it('reports a click on a shared button with the challenge it was on', () => {
    const calls = record();
    reportChallengeUi('/en/streaks/killer/chaos-streak', 'rules');
    assert.deepEqual(calls, [{ name: 'challenge_ui', data: { challenge: 'chaos', action: 'rules' } }]);
  });

  it('says nothing off a challenge page', () => {
    const calls = record();
    reportChallengeUi('/en/perks', 'rules');
    assert.deepEqual(calls, []);
  });

  it('reports a change of mode only when the mode really changed', () => {
    const calls = record();
    reportModeChange('chaos', 'killer', 'medium', 'hell');
    reportModeChange('chaos', 'killer', 'hell', 'hell');
    assert.deepEqual(calls, [{ name: 'challenge_mode_change', data: { challenge: 'chaos', role: 'killer', from: 'medium', to: 'hell' } }]);
  });
});
