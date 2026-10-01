// frontend/src/__tests__/unit/tierListStorageAndBoard.test.ts
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { TierItem } from '@/types/tierList';
import {
  TIER_LIST_STORAGE_KEY,
  clearRanking,
  createCustomListId,
  deleteCustomList,
  getTierListSnapshot,
  loadTierListState,
  migrateTierListState,
  resetTierListStoreCache,
  saveCustomList,
  saveRanking,
  saveTierListState,
  subscribeTierListStore,
} from '@/utils/tierLists/storage';
import {
  addTier,
  buildBoard,
  clearTier,
  moveItem,
  moveTier,
  placementsFromBoard,
  removeTier,
  resolveTiers,
} from '@/utils/tierLists/board';
import { DEFAULT_TIERS, POOL_CONTAINER_ID } from '@/utils/tierLists/constants';

const memory: Record<string, string> = {};
let failWith: Error | null = null;
globalThis.localStorage = {
  getItem: (k: string) => memory[k] ?? null,
  setItem: (k: string, v: string) => {
    if (failWith) throw failWith;
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
  failWith = null;
  resetTierListStoreCache();
});

describe('tier list storage', () => {
  it('starts empty and survives corrupt JSON', () => {
    assert.deepEqual(loadTierListState().rankings, {});
    memory[TIER_LIST_STORAGE_KEY] = '{corrupt';
    assert.deepEqual(loadTierListState().custom, {});
  });

  it('persists rankings and notifies subscribers', () => {
    let calls = 0;
    const stop = subscribeTierListStore(() => {
      calls += 1;
    });
    const result = saveRanking('survivors', { tiers: null, placements: { s: ['survivor:1'] } });
    stop();

    assert.deepEqual(result, { ok: true });
    assert.equal(calls, 1);
    assert.deepEqual(getTierListSnapshot().rankings.survivors.placements, { s: ['survivor:1'] });
    resetTierListStoreCache();
    assert.deepEqual(loadTierListState().rankings.survivors.placements, { s: ['survivor:1'] });

    clearRanking('survivors');
    assert.equal(getTierListSnapshot().rankings.survivors, undefined);
  });

  it('returns the same snapshot object until something changes', () => {
    const a = getTierListSnapshot();
    assert.equal(getTierListSnapshot(), a);
    saveRanking('maps', { tiers: null, placements: {} });
    assert.notEqual(getTierListSnapshot(), a);
  });

  it('reports a full quota without losing the in-memory board', () => {
    const quota = new Error('The quota has been exceeded.');
    quota.name = 'QuotaExceededError';
    failWith = quota;
    const result = saveRanking('killers', { tiers: null, placements: { s: ['killer:1'] } });
    assert.deepEqual(result, { ok: false, reason: 'quota' });
    assert.deepEqual(getTierListSnapshot().rankings.killers.placements, { s: ['killer:1'] });
  });

  it('saves, sanitizes and deletes custom lists', () => {
    const id = createCustomListId();
    assert.match(id, /^[a-z0-9]{6,10}$/);
    saveCustomList({
      id,
      title: 'Mine',
      description: '',
      tiers: DEFAULT_TIERS.map((t) => ({ ...t })),
      items: [{ id: 'a', name: 'A', image: 'https://x.test/a.png' }],
      placements: { s: ['a'] },
      createdAt: 1,
    });
    assert.equal(getTierListSnapshot().custom[id].title, 'Mine');
    deleteCustomList(id);
    assert.equal(getTierListSnapshot().custom[id], undefined);
  });

  it('migrates hand-edited storage defensively', () => {
    const state = migrateTierListState({
      rankings: { maps: { placements: { s: ['map:1', 7] }, tiers: 'nope' }, broken: 5 },
      custom: {
        ok: {
          title: 'X',
          tiers: [{ id: 's', label: 'S', color: 'javascript:1' }],
          items: [{ id: 'a', name: 'A', image: 'javascript:alert(1)' }, { id: 'bad id', name: 'B' }],
          placements: { s: ['a', 'ghost'] },
        },
        empty: { title: 'Blank', tiers: [{ id: 's', label: 'S' }], items: [] },
        noTiers: { title: 'Broken', tiers: 'nope', items: [{ id: 'a', name: 'A' }] },
      },
    });
    assert.deepEqual(state.rankings.maps.placements, { s: ['map:1'] });
    assert.equal(state.rankings.maps.tiers, null);
    assert.equal(state.rankings.broken, undefined);
    assert.deepEqual(Object.keys(state.custom), ['ok', 'empty'], 'a blank list is kept, one without tiers is not');
    assert.equal(state.custom.ok.tiers[0].color, 'neutral');
    assert.deepEqual(state.custom.ok.items, [{ id: 'a', name: 'A' }]);
    assert.deepEqual(state.custom.ok.placements, { s: ['a'] });
  });

  it('reports unavailable storage', () => {
    assert.deepEqual(saveTierListState(getTierListSnapshot(), null), { ok: false, reason: 'unavailable' });
  });
});

const items: TierItem[] = ['a', 'b', 'c', 'd'].map((k) => ({ key: k, name: k.toUpperCase(), image: null }));
const order = items.map((i) => i.key);

describe('tier board model', () => {
  it('lays placements over items and puts the rest in the pool, in catalog order', () => {
    const tiers = resolveTiers(null, undefined);
    const board = buildBoard(items, tiers, { s: ['c', 'ghost', 'c'], a: ['a'] });
    assert.deepEqual(board.s, ['c']);
    assert.deepEqual(board.a, ['a']);
    assert.deepEqual(board[POOL_CONTAINER_ID], ['b', 'd']);
  });

  it('moves items between and within containers', () => {
    const tiers = resolveTiers();
    let board = buildBoard(items, tiers, {});
    board = moveItem(board, 'd', 's', 0, order);
    board = moveItem(board, 'b', 's', 0, order);
    assert.deepEqual(board.s, ['b', 'd']);
    board = moveItem(board, 'b', 's', 5, order);
    assert.deepEqual(board.s, ['d', 'b']);
    board = moveItem(board, 'd', POOL_CONTAINER_ID, 0, order);
    assert.deepEqual(board[POOL_CONTAINER_ID], ['a', 'c', 'd'], 'the pool stays in catalog order');
  });

  it('keeps placements of items the view does not show (e.g. a disabled perk)', () => {
    const tiers = resolveTiers();
    const previous = { s: ['a', 'hidden-perk'], a: [] as string[] };
    const board = buildBoard(items, tiers, previous);
    const saved = placementsFromBoard(board, tiers, previous, new Set(order));
    assert.deepEqual(saved.s, ['a', 'hidden-perk']);
  });

  it('edits the ladder', () => {
    let state = { tiers: resolveTiers(), board: buildBoard(items, resolveTiers(), { s: ['a'], a: ['b'] }) };
    state = addTier(state, 'God tier', '#123456', 0);
    assert.equal(state.tiers[0].id, 'god-tier');
    assert.deepEqual(state.board['god-tier'], []);

    state = moveTier(state, 'god-tier', 1);
    assert.equal(state.tiers[1].id, 'god-tier');

    state = removeTier(state, 's', order);
    assert.equal(state.board.s, undefined);
    assert.deepEqual(state.board[POOL_CONTAINER_ID], ['a', 'c', 'd']);

    state = clearTier(state, 'a', order);
    assert.deepEqual(state.board[POOL_CONTAINER_ID], order);
  });

  it('never removes the last tier', () => {
    const one = { tiers: [{ id: 'x', label: 'X', color: 's' }], board: { x: [], [POOL_CONTAINER_ID]: order } };
    assert.equal(removeTier(one, 'x', order), one);
  });
});
