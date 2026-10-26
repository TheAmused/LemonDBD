// frontend/src/__tests__/unit/user/useUserShowcaseSync.test.tsx
//
// The showcase editor keeps a local copy and the account's database copy in step:
// - edits made before the saved showcase has loaded are replayed on the DATABASE copy (saving the
//   whole local copy instead used to overwrite what another device had saved);
// - a failed save is retried once before the error is shown.
import { act, deferred, renderHook, routeFetch, waitFor } from '../../helpers/dom';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useUserShowcase, saveStoredShowcase, mergeShowcaseState } from '@/hooks/useUserShowcase';
import { SESSION_FLAG_KEY } from '@/utils/api';

let api: ReturnType<typeof routeFetch> | null = null;
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(SESSION_FLAG_KEY, '1');
});
afterEach(() => api?.restore());

const savedBodies = () => api!.calls.filter((c) => c.method === 'PUT').map((c) => c.body as Record<string, unknown>);

describe('useUserShowcase', () => {
  it('an edit made before the database copy arrives is applied on top of that copy', async () => {
    // This browser holds an old copy; another device has saved devotion 42 in the meantime.
    saveStoredShowcase(7, { ...mergeShowcaseState(null), devotionLevel: 5, gradeRank: 'Iridescent I' });
    const dbCopy = deferred<{ body: unknown }>();
    api = routeFetch({
      'GET /users/7/showcase': () => dbCopy.promise,
      'PUT /users/7/showcase': { body: { status: 'success', data: {} } },
    });
    const { result } = renderHook(() => useUserShowcase(7));
    act(() => result.current.setGradeRank('Iridescent II'));
    dbCopy.resolve({ body: { data: { devotion_level: 42, grade_rank: 'Iridescent IV', player_title: 'Killer' } } });

    await waitFor(() => assert.equal(result.current.isLoading, false));
    assert.equal(result.current.showcase.devotionLevel, 42, 'the database copy wins over the stale local one');
    assert.equal(result.current.showcase.playerTitle, 'Killer');
    assert.equal(result.current.showcase.gradeRank, 'Iridescent II', 'the early edit is replayed on it');
    await waitFor(() => assert.equal(savedBodies().length, 1));
  });

  it('a failed save is retried once before the error is shown', async () => {
    let puts = 0;
    api = routeFetch({
      'GET /users/7/showcase': { body: { data: {} } },
      'PUT /users/7/showcase': () => (++puts === 1 ? { status: 500, body: { error: 'busy' } } : { body: { status: 'success', data: {} } }),
    });
    const { result } = renderHook(() => useUserShowcase(7));
    await waitFor(() => assert.equal(result.current.isLoading, false));
    act(() => result.current.setDevotionLevel(10));
    // 300 ms debounce, a failure, then the 2 s retry.
    await act(() => new Promise((r) => setTimeout(r, 2600)));
    assert.equal(puts, 2);
    assert.equal(result.current.saveError, null);
  });
});
