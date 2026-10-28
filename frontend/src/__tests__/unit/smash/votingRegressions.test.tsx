// frontend/src/__tests__/unit/smash/votingRegressions.test.tsx
//
// Three voting regressions from the 2026-10-19 review, as behaviour:
// - a card exit that was cancelled must release the vote guard (it used to lock voting until reload);
// - a vote sync for a roster the viewer already left must not replace the history now shown;
// - a failed backend reset keeps the local history (it would come back on the next sync anyway).
import { act, deferred, renderHook, routeFetch, waitFor, withAppProviders } from '../../helpers/dom';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useSmashVotes } from '@/components/smash-or-pass/hub/useSmashVotes';
import { useSmashVoting } from '@/components/smash-or-pass/hub/useSmashVoting';
import type { EntityItem } from '@/types/smashOrPass';

const meg: EntityItem = { id: 'e1', roster_id: 'canon', slug: 'meg_thomas', name: 'Meg Thomas', role: 'Survivor', gender: 'female' };
const vote = (slug: string) => ({ character_slug: slug, vote_type: 'smash', created_at: '2026-10-01T10:00:00Z' });

let api: ReturnType<typeof routeFetch> | null = null;
beforeEach(() => localStorage.clear());
afterEach(() => api?.restore());

describe('useSmashVotes', () => {
  it('a late sync for the roster the viewer left does not replace the history now shown', async () => {
    const slowCanon = deferred<{ body: unknown }>();
    api = routeFetch({
      '/auth/me': { body: { authenticated: false } },
      '/site-config': { body: {} },
      '/smash-or-pass/user-votes': (call) =>
        call.url.includes('edition=canon') ? slowCanon.promise : { body: { data: [vote('the_hag')], count: 1 } },
    });
    const { result, rerender } = renderHook((props: { slug: string }) => useSmashVotes(props.slug), {
      wrapper: withAppProviders().wrapper,
      initialProps: { slug: 'canon' },
    });
    rerender({ slug: 'legends' });
    await waitFor(() => assert.deepEqual(result.current.voteHistory.map((v) => v.character.slug), ['the_hag']));
    slowCanon.resolve({ body: { data: [vote('meg_thomas'), vote('dwight')], count: 2 } });
    await new Promise((r) => setTimeout(r, 30));
    assert.deepEqual(result.current.voteHistory.map((v) => v.character.slug), ['the_hag']);
  });

  it('a failed backend reset keeps the local history, a successful one clears it', async () => {
    let resetOk = false;
    api = routeFetch({
      '/auth/me': { body: { authenticated: false } },
      '/site-config': { body: {} },
      '/smash-or-pass/user-votes': { body: { data: [], count: 0 } },
      'POST /smash-or-pass/session/reset': () => (resetOk ? { body: { status: 'success', reset_count: 1 } } : { status: 500, body: { error: 'down' } }),
    });
    const { result } = renderHook(() => useSmashVotes('canon'), { wrapper: withAppProviders().wrapper });
    await waitFor(() => assert.ok(api!.calls.some((c) => c.url.includes('/user-votes'))));
    act(() => result.current.recordVote(meg, 'smash'));
    assert.equal(result.current.voteHistory.length, 1);

    let cleared: boolean | undefined;
    await act(async () => void (cleared = await result.current.clearVotes()));
    assert.equal(cleared, false);
    assert.equal(result.current.voteHistory.length, 1, 'kept after a failed reset');

    resetOk = true;
    await act(async () => void (cleared = await result.current.clearVotes()));
    assert.equal(cleared, true);
    assert.equal(result.current.voteHistory.length, 0);
  });
});

describe('useSmashVoting', () => {
  it('a cancelled card exit releases the vote guard, so the next vote counts', async () => {
    api = routeFetch({ '/smash-or-pass/vote': { body: { status: 'success' } } });
    const recorded: string[] = [];
    const exitFor = (isExiting: boolean) => ({
      isExiting,
      dragPhysics: { x: 0, y: 0, isDragging: false },
      beginExit: () => {}, // the exit never completes: it gets cancelled below
    });
    const { result, rerender } = renderHook(
      (props: { isExiting: boolean }) =>
        useSmashVoting({
          currentCharacter: meg,
          selectedRosterSlug: 'local:mine',
          exit: exitFor(props.isExiting) as never,
          onExitComplete: () => {},
          recordVote: (_c, v) => void recorded.push(v),
          setLeaderboardItems: () => {},
          loadLeaderboard: async () => {},
          effectsEnabled: false,
        }),
      { initialProps: { isExiting: false } }
    );
    await act(() => result.current.handleVote('smash'));
    rerender({ isExiting: true });
    rerender({ isExiting: false }); // the exit was cancelled
    await act(() => result.current.handleVote('pass'));
    assert.deepEqual(recorded, ['smash', 'pass']);
  });
});
