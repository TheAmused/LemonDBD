// frontend/src/utils/challengeCheckpoints.ts
import type { GauntletGameMode } from '@/types/gauntletStreak';

/** Win counts 1..total-1 that are a multiple of `interval`; none when the mode has no checkpoints. */
export function everyNthCheckpoint(interval: number, total: number): number[] {
  if (interval <= 0) return [];
  const positions: number[] = [];
  for (let n = interval; n < total; n += interval) positions.push(n);
  return positions;
}

// Mirrors backend/app/services/gauntlet/constants.py, which decides where a run actually banks one.
const GAUNTLET_DEFAULT_INTERVAL = 10;
const GAUNTLET_SHORT_INTERVAL = 5;
const GAUNTLET_TEAM_STAGE_STARTS = [6, 12, 18];
/** Characters the server deals into one match; a team match clears several at once. */
const GAUNTLET_TEAM_CHARACTERS_PER_MATCH = 2;

const isTeamMode = (mode: GauntletGameMode) => mode === 'lemon_duo' || mode === 'lemon_squad';

/** How many wins clear a Gauntlet roster of `rosterSize` characters. */
export function gauntletRunLength(mode: GauntletGameMode, rosterSize: number): number {
  return isTeamMode(mode) ? Math.ceil(rosterSize / GAUNTLET_TEAM_CHARACTERS_PER_MATCH) : rosterSize;
}

export function gauntletCheckpoints(mode: GauntletGameMode, total: number): number[] {
  if (isTeamMode(mode)) return GAUNTLET_TEAM_STAGE_STARTS.filter((n) => n < total);
  const short = mode === 'lemon_solo' || mode === 'lemon_killer';
  return everyNthCheckpoint(short ? GAUNTLET_SHORT_INTERVAL : GAUNTLET_DEFAULT_INTERVAL, total);
}
