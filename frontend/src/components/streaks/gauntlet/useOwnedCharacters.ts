// frontend/src/components/streaks/gauntlet/useOwnedCharacters.ts
'use client';

import { Role } from '@/types/gauntletStreak';
import { useOwnedRoster } from '../useOwnedRoster';

export type { OwnedCharacterItem } from '../useOwnedRoster';

/**
 * Original mode caps its roster at the source challenge's cutoff; see
 * `useOwnedRoster` for how `rosterLimit` is applied.
 */
export function useOwnedCharacters(role: Role, rosterLimit?: number) {
  return useOwnedRoster(role === 'killer' ? 'Killer' : 'Survivor', rosterLimit);
}
