// frontend/src/__tests__/unit/analytics/analyticsTierLists.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { TierDefinition, TierListDocumentItem } from '@/types/tierList';
import {
  CUSTOM_LIST_TAG,
  buildListCreateProps,
  finishedByMove,
  ownItemCount,
  unrankedCount,
} from '@/components/tier-lists/tierListTracking';
import { POOL_CONTAINER_ID } from '@/utils/tierLists/constants';

const TIERS: TierDefinition[] = [
  { id: 's', label: 'S', color: 's' },
  { id: 'a', label: 'A', color: 'a' },
];

function item(id: string): TierListDocumentItem {
  return { id, name: id };
}

describe('unrankedCount', () => {
  it('counts what is left in the pool', () => {
    assert.equal(unrankedCount({ s: ['x'], [POOL_CONTAINER_ID]: ['y', 'z'] }), 2);
  });

  it('is zero for a board without a pool', () => {
    assert.equal(unrankedCount({ s: ['x'] }), 0);
  });
});

describe('finishedByMove', () => {
  it('is true for the move that takes the last item out of the pool', () => {
    const before = { s: ['x'], a: [], [POOL_CONTAINER_ID]: ['y'] };
    const after = { s: ['x'], a: ['y'], [POOL_CONTAINER_ID]: [] };
    assert.equal(finishedByMove(before, after, 2), true);
  });

  it('is false while the pool still has items', () => {
    const before = { s: [], [POOL_CONTAINER_ID]: ['x', 'y'] };
    const after = { s: ['x'], [POOL_CONTAINER_ID]: ['y'] };
    assert.equal(finishedByMove(before, after, 2), false);
  });

  it('is false for a move on a list that was already fully ranked', () => {
    const before = { s: ['x'], a: ['y'], [POOL_CONTAINER_ID]: [] };
    const after = { s: ['y'], a: ['x'], [POOL_CONTAINER_ID]: [] };
    assert.equal(finishedByMove(before, after, 2), false);
  });

  it('is false for a list without items', () => {
    assert.equal(finishedByMove({ [POOL_CONTAINER_ID]: [] }, { [POOL_CONTAINER_ID]: [] }, 0), false);
  });
});

describe('ownItemCount', () => {
  it('leaves out catalog picks, whose id carries the catalog prefix', () => {
    assert.equal(ownItemCount([item('survivor:7'), item('perk:12'), item('map:3'), item('killer:1')]), 0);
  });

  it('counts items added by link or upload', () => {
    assert.equal(ownItemCount([item('survivor:7'), item('my-friend'), item('item-2')]), 2);
  });

  it('does not take any id with a colon for a catalog pick', () => {
    assert.equal(ownItemCount([item('a:b'), item('perk:abc'), item('survivor:7')]), 2);
  });
});

describe('buildListCreateProps', () => {
  it('describes a list made of catalog picks on a preset ladder', () => {
    assert.deepEqual(
      buildListCreateProps({
        items: [item('survivor:1'), item('killer:2')],
        tiers: TIERS,
        preset: 'classic',
        nsfw: false,
        coverImage: false,
      }),
      { items: 2, own_items: 0, tiers: 2, ladder: 'classic', cover_image: false, nsfw: false }
    );
  });

  it('marks an edited ladder as custom and reports own items, cover and the NSFW flag', () => {
    assert.deepEqual(
      buildListCreateProps({
        items: [item('survivor:1'), item('my-friend')],
        tiers: TIERS,
        preset: null,
        nsfw: true,
        coverImage: true,
      }),
      { items: 2, own_items: 1, tiers: 2, ladder: 'custom', cover_image: true, nsfw: true }
    );
  });
});

describe('CUSTOM_LIST_TAG', () => {
  it('reports a made list as custom, never by its title', () => {
    assert.deepEqual(CUSTOM_LIST_TAG, { list: 'custom', kind: 'custom' });
  });
});
