// frontend/src/utils/historyPick.ts
// The killer picked (and accepted) on a History Streak board, kept in localStorage so a refresh does not lose it.

export interface HistoryPick {
  selected: string | null;
  /** The pick was accepted and the match is being played. */
  accepted: string | null;
}

export const EMPTY_HISTORY_PICK: HistoryPick = { selected: null, accepted: null };

const PICK_KEY_PREFIX = 'lemon_dbd_history_pick_v1_';

export const historyPickStorageKey = (mode: string): string => `${PICK_KEY_PREFIX}${mode}`;

export function serializeHistoryPick(key: string, pick: HistoryPick): string {
  return JSON.stringify({ key, selected: pick.selected, accepted: pick.accepted });
}

/**
 * The saved pick for this row of this run, or an empty one. A pick saved for any other row or run, or for a killer
 * that is not in the row (a changed roster, a hand-edited value), is ignored.
 */
export function readHistoryPick(raw: string | null, key: string, rowKillers: readonly string[]): HistoryPick {
  if (raw === null) return EMPTY_HISTORY_PICK;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return EMPTY_HISTORY_PICK;
  }
  if (typeof saved !== 'object' || saved === null) return EMPTY_HISTORY_PICK;
  const { key: savedKey, selected, accepted } = saved as Record<string, unknown>;
  if (savedKey !== key) return EMPTY_HISTORY_PICK;
  const inRow = (value: unknown): string | null => (typeof value === 'string' && rowKillers.includes(value) ? value : null);
  return { selected: inRow(selected), accepted: inRow(accepted) };
}
