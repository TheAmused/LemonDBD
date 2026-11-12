'use client';
// frontend/src/components/tier-lists/tierListTracking.ts
//
// What the tier list pages tell Umami (see utils/analytics.ts for the catalogue). A ranking is reported
// when it starts (the first move in a visit) and when it is finished (the last item leaves the
// unranked pool), each once per list per visit.
import { useCallback } from 'react';
import type { TierDefinition, TierListDocumentItem } from '@/types/tierList';
import type { AnalyticsEvents, TierListTag } from '@/utils/analytics';
import { trackEvent } from '@/utils/analytics';
import type { BoardContainers } from '@/utils/tierLists/board';
import { POOL_CONTAINER_ID } from '@/utils/tierLists/constants';
import type { LadderPresetId } from '@/utils/tierLists/creator';

/** The tag of a list the visitor made: it has no slug worth reporting, and its title is their own text. */
export const CUSTOM_LIST_TAG: TierListTag = { list: 'custom', kind: 'custom' };

/** Items still waiting in the unranked pool. */
export function unrankedCount(board: BoardContainers): number {
  return board[POOL_CONTAINER_ID]?.length ?? 0;
}

/** True when a move took the last item out of the pool of a list that has items. */
export function finishedByMove(before: BoardContainers, after: BoardContainers, itemCount: number): boolean {
  return itemCount > 0 && unrankedCount(before) > 0 && unrankedCount(after) === 0;
}

/**
 * What was already reported in this visit (until the page is reloaded), by list: its slug, or the id of
 * a custom list. It lives outside the editor on purpose: leaving a list and opening it again remounts
 * the editor, and that must not count as a second start or a second finish.
 */
const rankedThisVisit = new Set<string>();
const finishedThisVisit = new Set<string>();

/**
 * Returns the function to call with the board before and after a move that was saved. Reports
 * `tier_list_rank` on the first move and `tier_list_complete` on the move that empties the pool, each
 * once per list per visit, so a list that is finished, changed and finished again (or reset and ranked
 * again) does not count twice. `listId` tells the lists apart (the tag does not: every custom list is `custom`).
 */
export function useTierListRankingTracking(
  tag: TierListTag,
  listId: string,
  itemCount: number
): (before: BoardContainers, after: BoardContainers) => void {
  const { list, kind } = tag;

  return useCallback(
    (before, after) => {
      if (!rankedThisVisit.has(listId)) {
        rankedThisVisit.add(listId);
        trackEvent('tier_list_rank', { list, kind });
      }
      if (!finishedThisVisit.has(listId) && finishedByMove(before, after, itemCount)) {
        finishedThisVisit.add(listId);
        trackEvent('tier_list_complete', { list, kind, items: itemCount });
      }
    },
    [list, kind, listId, itemCount]
  );
}

/** What a catalog pick looks like as an item id (`survivor:7`, `perk:12`, `map:3`); anything else was added by link or upload. */
const CATALOG_ITEM_ID = /^(survivor|killer|perk|map):\d+$/;

/** Items added by link or upload, as opposed to picked from the game's catalog. */
export function ownItemCount(items: readonly TierListDocumentItem[]): number {
  return items.filter((item) => !CATALOG_ITEM_ID.test(item.id)).length;
}

interface CreatedList {
  items: readonly TierListDocumentItem[];
  tiers: readonly TierDefinition[];
  /** The ladder preset that was picked, null once the tiers were edited by hand. */
  preset: LadderPresetId | null;
  nsfw: boolean;
  /** A background image was set (and passed the image check). */
  coverImage: boolean;
}

/** The props of `tier_list_create`. */
export function buildListCreateProps(list: CreatedList): AnalyticsEvents['tier_list_create'] {
  return {
    items: list.items.length,
    own_items: ownItemCount(list.items),
    tiers: list.tiers.length,
    ladder: list.preset ?? 'custom',
    cover_image: list.coverImage,
    nsfw: list.nsfw,
  };
}
