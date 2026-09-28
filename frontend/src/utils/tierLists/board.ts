// frontend/src/utils/tierLists/board.ts
/**
 * Pure board model: which item sits in which container, in what order.
 *
 * A board is `Record<containerId, itemKey[]>` -- one entry per tier plus the
 * unranked pool (`POOL_CONTAINER_ID`). Placements (what gets saved) are the
 * same thing minus the pool: the pool is always "every item not placed", in
 * catalog order, so it never needs storing.
 */
import type { TierDefinition, TierItem, TierPlacements } from '@/types/tierList';
import { DEFAULT_TIERS, POOL_CONTAINER_ID, TIER_LIST_LIMITS } from './constants';
import { slugifyItemId, uniqueId } from './codec';

export type BoardContainers = Record<string, string[]>;

/** The ladder to draw: the user's own, else the template's, else S..F. */
export function resolveTiers(...candidates: (readonly TierDefinition[] | null | undefined)[]): TierDefinition[] {
  for (const tiers of candidates) {
    if (tiers && tiers.length) return tiers.map((t) => ({ ...t }));
  }
  return DEFAULT_TIERS.map((t) => ({ ...t }));
}

/**
 * Lays placements out over the current items. Keys of items that are not in
 * the list any more (a disabled perk, an unknown key) are simply not shown --
 * `placementsFromBoard` puts them back on save, so a temporary kill switch
 * does not erase anybody's ranking.
 */
export function buildBoard(
  items: readonly TierItem[],
  tiers: readonly TierDefinition[],
  placements: TierPlacements | null | undefined
): BoardContainers {
  const known = new Set(items.map((i) => i.key));
  const placed = new Set<string>();
  const board: BoardContainers = {};

  for (const tier of tiers) {
    board[tier.id] = [];
    for (const key of placements?.[tier.id] ?? []) {
      if (known.has(key) && !placed.has(key)) {
        board[tier.id].push(key);
        placed.add(key);
      }
    }
  }
  board[POOL_CONTAINER_ID] = items.filter((i) => !placed.has(i.key)).map((i) => i.key);
  return board;
}

/**
 * Board -> placements to save. `previous` supplies the hidden keys (items the
 * current view does not contain) so they survive in their old tier.
 */
export function placementsFromBoard(
  board: BoardContainers,
  tiers: readonly TierDefinition[],
  previous?: TierPlacements | null,
  visibleKeys?: ReadonlySet<string>
): TierPlacements {
  const out: TierPlacements = {};
  const onBoard = new Set(Object.values(board).flat());
  for (const tier of tiers) {
    const hidden = (previous?.[tier.id] ?? []).filter(
      (key) => !onBoard.has(key) && (!visibleKeys || !visibleKeys.has(key))
    );
    out[tier.id] = [...(board[tier.id] ?? []), ...hidden];
  }
  return out;
}

/**
 * The container holding item `key`. Item keys and tier ids are separate
 * namespaces (a custom item may well be called "a"), so this only ever
 * searches the item lists -- the drag layer prefixes its ids to keep the two
 * apart as well.
 */
export function findContainer(board: BoardContainers, key: string): string | null {
  for (const [container, keys] of Object.entries(board)) {
    if (keys.includes(key)) return container;
  }
  return null;
}

/**
 * Moves `key` to `toContainer` at `index` (clamped; default: the end). The
 * pool is re-sorted to catalog order, because the pool has no order of its own.
 */
export function moveItem(
  board: BoardContainers,
  key: string,
  toContainer: string,
  index: number | undefined,
  catalogOrder: readonly string[]
): BoardContainers {
  const from = findContainer(board, key);
  if (!from || !(toContainer in board)) return board;

  const next: BoardContainers = { ...board, [from]: board[from].filter((k) => k !== key) };
  const target = from === toContainer ? next[from] : [...board[toContainer]];

  if (toContainer === POOL_CONTAINER_ID) {
    const inPool = new Set([...target, key]);
    next[POOL_CONTAINER_ID] = catalogOrder.filter((k) => inPool.has(k));
    return next;
  }

  const at = index === undefined ? target.length : Math.max(0, Math.min(index, target.length));
  target.splice(at, 0, key);
  next[toContainer] = target;
  return next;
}

// ---------------------------------------------------------------------------
// Tier ladder edits. Each returns the new tiers and board together, since
// removing a tier has to send its items somewhere (the pool).
// ---------------------------------------------------------------------------

export interface LadderState {
  tiers: TierDefinition[];
  board: BoardContainers;
}

export function addTier(state: LadderState, label: string, color: string, atIndex?: number): LadderState {
  if (state.tiers.length >= TIER_LIST_LIMITS.maxTiers) return state;
  const id = uniqueId(slugifyItemId(label || 'tier'), new Set([...state.tiers.map((t) => t.id), POOL_CONTAINER_ID]));
  const tiers = [...state.tiers];
  tiers.splice(atIndex === undefined ? tiers.length : Math.max(0, Math.min(atIndex, tiers.length)), 0, {
    id,
    label: label.slice(0, TIER_LIST_LIMITS.maxTierLabel),
    color,
  });
  return { tiers, board: { ...state.board, [id]: [] } };
}

export function updateTier(state: LadderState, id: string, patch: Partial<Omit<TierDefinition, 'id'>>): LadderState {
  return {
    ...state,
    tiers: state.tiers.map((t) =>
      t.id === id
        ? { ...t, ...patch, label: (patch.label ?? t.label).slice(0, TIER_LIST_LIMITS.maxTierLabel) }
        : t
    ),
  };
}

export function removeTier(state: LadderState, id: string, catalogOrder: readonly string[]): LadderState {
  if (state.tiers.length <= 1) return state;
  const freed = new Set([...(state.board[POOL_CONTAINER_ID] ?? []), ...(state.board[id] ?? [])]);
  const board = { ...state.board };
  delete board[id];
  board[POOL_CONTAINER_ID] = catalogOrder.filter((k) => freed.has(k));
  return { tiers: state.tiers.filter((t) => t.id !== id), board };
}

export function clearTier(state: LadderState, id: string, catalogOrder: readonly string[]): LadderState {
  const freed = new Set([...(state.board[POOL_CONTAINER_ID] ?? []), ...(state.board[id] ?? [])]);
  return {
    ...state,
    board: { ...state.board, [id]: [], [POOL_CONTAINER_ID]: catalogOrder.filter((k) => freed.has(k)) },
  };
}

export function moveTier(state: LadderState, id: string, direction: -1 | 1): LadderState {
  const index = state.tiers.findIndex((t) => t.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.tiers.length) return state;
  const tiers = [...state.tiers];
  [tiers[index], tiers[target]] = [tiers[target], tiers[index]];
  return { ...state, tiers };
}
