// frontend/src/__tests__/unit/analytics/analyticsShowcase.test.ts
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { completedShowcaseRoles, reportCompleteShowcaseRoles } from '@/utils/userShowcaseAnalytics';
import { DEFAULT_SHOWCASE_STATE, type UserShowcaseState } from '@/types/userShowcase';

const g = globalThis as { window?: unknown; localStorage?: unknown };
afterEach(() => {
  delete g.window;
  delete g.localStorage;
});

const withPerks = (survivor: (number | null)[], killer: (number | null)[]): UserShowcaseState => ({
  ...DEFAULT_SHOWCASE_STATE,
  survivorMain: { ...DEFAULT_SHOWCASE_STATE.survivorMain, perkIds: survivor },
  killerMain: { ...DEFAULT_SHOWCASE_STATE.killerMain, perkIds: killer },
});

describe('completedShowcaseRoles', () => {
  it('needs all 4 perks of a role, the character does not count', () => {
    assert.deepEqual(completedShowcaseRoles(DEFAULT_SHOWCASE_STATE), []);
    assert.deepEqual(completedShowcaseRoles(withPerks([1, 2, 3, null], [4, 5, 6, 7])), ['killer']);
    assert.deepEqual(completedShowcaseRoles(withPerks([1, 2, 3, 4], [4, 5, 6, 7])), ['survivor', 'killer']);
  });
});

describe('reportCompleteShowcaseRoles', () => {
  function install(): { names: string[]; store: Map<string, string> } {
    const names: string[] = [];
    const store = new Map<string, string>();
    g.window = { umami: { track: (name: string) => names.push(name) } };
    g.localStorage = {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    return { names, store };
  }

  it('reports each complete role once per user, even if perks change later', () => {
    const { names } = install();
    reportCompleteShowcaseRoles(5, withPerks([1, 2, 3, 4], [null, null, null, null]));
    reportCompleteShowcaseRoles(5, withPerks([9, 2, 3, 4], [null, null, null, null]));
    assert.deepEqual(names, ['showcase_complete']);
  });

  it('ignores guests and missing users', () => {
    const { names } = install();
    reportCompleteShowcaseRoles('guest', withPerks([1, 2, 3, 4], [1, 2, 3, 4]));
    reportCompleteShowcaseRoles(null, withPerks([1, 2, 3, 4], [1, 2, 3, 4]));
    reportCompleteShowcaseRoles(undefined, withPerks([1, 2, 3, 4], [1, 2, 3, 4]));
    assert.deepEqual(names, []);
  });
});
