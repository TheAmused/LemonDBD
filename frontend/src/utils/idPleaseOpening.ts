// frontend/src/utils/idPleaseOpening.ts
// The opening being chosen on an ID, Please setup (the side and the perks), kept in localStorage so a refresh does not lose it.
import type { IdPleaseSide } from '@/types/idPleaseStreak';

/** Perks in an opening. */
export const ID_PLEASE_LOADOUT_SIZE = 4;

export interface IdPleaseOpening {
  /** The side picked in the mixed lane; null until one was picked. */
  side: IdPleaseSide | null;
  /** Inventory positions of the chosen perks, in the order they were picked. */
  positions: number[];
}

export const EMPTY_ID_PLEASE_OPENING: IdPleaseOpening = { side: null, positions: [] };

const OPENING_KEY_PREFIX = 'lemon_dbd_id_please_opening_v1_';

export const idPleaseOpeningStorageKey = (lane: string, difficulty: string): string => `${OPENING_KEY_PREFIX}${lane}_${difficulty}`;

export function serializeIdPleaseOpening(key: string, opening: IdPleaseOpening): string {
  return JSON.stringify({ key, side: opening.side, positions: opening.positions });
}

/**
 * The saved opening for this attempt and roster, or an empty one. What was saved for any other attempt, for a roster
 * that has since changed, or that is not a valid opening (a hand-edited value), is ignored.
 */
export function readIdPleaseOpening(raw: string | null, key: string): IdPleaseOpening {
  if (raw === null) return EMPTY_ID_PLEASE_OPENING;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return EMPTY_ID_PLEASE_OPENING;
  }
  if (typeof saved !== 'object' || saved === null) return EMPTY_ID_PLEASE_OPENING;
  const { key: savedKey, side, positions } = saved as Record<string, unknown>;
  if (savedKey !== key || !Array.isArray(positions) || positions.length > ID_PLEASE_LOADOUT_SIZE) return EMPTY_ID_PLEASE_OPENING;
  if (!positions.every((p) => Number.isInteger(p) && p >= 0) || new Set(positions).size !== positions.length) return EMPTY_ID_PLEASE_OPENING;
  return { side: side === 'killer' || side === 'survivor' ? side : null, positions: positions as number[] };
}
