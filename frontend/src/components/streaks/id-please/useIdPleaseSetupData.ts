'use client';
// frontend/src/components/streaks/id-please/useIdPleaseSetupData.ts

import { useAuth } from '@/context/AuthContext';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchIdPleasePreview, fetchIdPleaseRoster } from '@/services/idPleaseStreakApi';
import type { IdPleaseDifficulty, IdPleaseLane, IdPleasePreview, IdPleaseRoster, IdPleaseSide } from '@/types/idPleaseStreak';

// Both answers are fixed by the roster fingerprint (plus the choice), so a repeat visit with the same roster is served
// from the shared cache: starting the next attempt after a loss shows the lists at once. Sign-in, sign-out and a
// changed roster (a new fingerprint, so a new key) never read another account's or an older roster's entry.

/** The player's numbered lists for a side. Reloads when the side or the roster fingerprint changes. */
export function useIdPleaseRoster(lane: IdPleaseLane, side: IdPleaseSide, fingerprint: string | undefined) {
  const { token } = useAuth();
  const key = token && fingerprint ? `id-please:roster:${lane}:${side}:${fingerprint}` : null;
  const { data } = useCachedData<IdPleaseRoster>(key, () => fetchIdPleaseRoster(lane, token as string, side));
  return { roster: data ?? null, loading: data === undefined };
}

/** Match 1 and 2 for four chosen positions, from the server so the preview can never disagree with the game. */
export function useIdPleasePreview(
  lane: IdPleaseLane,
  difficulty: IdPleaseDifficulty,
  side: IdPleaseSide,
  positions: number[],
  fingerprint: string | undefined
) {
  const { token } = useAuth();
  const sorted = [...positions].sort((a, b) => a - b);
  const key = token && fingerprint && sorted.length === 4 ? `id-please:preview:${lane}:${difficulty}:${side}:${sorted.join(',')}:${fingerprint}` : null;
  const { data } = useCachedData<IdPleasePreview>(key, () => fetchIdPleasePreview(lane, token as string, side, sorted, difficulty));
  return data ?? null;
}
