// frontend/src/components/streaks/useOwnedRoster.ts
'use client';

import { logger } from '@/utils/logger';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sortByReleaseNumber } from '@/utils/characterUtils';
import { backendBase } from '@/utils/staticUrl';
import type { Role } from '@/types/gauntletStreak';

export interface OwnedCharacterItem {
  name: string;
  avatar_local_path?: string;
}

export type OwnedRosterRole = 'Killer' | 'Survivor';

interface RosterApiCharacter {
  name: string;
  is_owned?: boolean;
  release_number?: number | null;
  avatar_local_path?: string;
}

/**
 * Pure part of the roster load: given the user's full character list for one
 * role, returns the owned characters in release order plus every character's
 * release-order index. `rosterLimit` drops owned characters released after
 * the cutoff (characters with no release number are always kept).
 */
export function selectOwnedRoster(all: RosterApiCharacter[], rosterLimit?: number) {
  const releaseOrder = new Map<string, number>(sortByReleaseNumber(all).map((c, i) => [c.name, i]));
  let owned = all.filter((c) => c.is_owned);
  if (rosterLimit != null) {
    owned = owned.filter((c) => c.release_number == null || c.release_number <= rosterLimit);
  }
  const characters: OwnedCharacterItem[] = sortByReleaseNumber(owned).map((c) => ({
    name: c.name,
    avatar_local_path: c.avatar_local_path,
  }));
  return { characters, releaseOrder };
}

/**
 * Loads the signed-in user's owned characters for one role, shared by the
 * Chaos/History killer picker and the Gauntlet roster. `rosterLimit` comes
 * from the gauntlet run's tier_info (the backend's own roster cutoff), so no
 * copy of the number lives here; until it has loaded the roster is shown
 * unfiltered rather than guessed at.
 */
export function useOwnedRoster(role: OwnedRosterRole, rosterLimit?: number) {
  const { token, user } = useAuth();
  const [characters, setCharacters] = useState<OwnedCharacterItem[]>([]);
  const [releaseOrder, setReleaseOrder] = useState<Map<string, number>>(new Map());
  const userId = user?.id;
  const [reloadCount, setReloadCount] = useState(0);
  // Loading until the request for this account, role and cutoff has settled (and while signed out).
  const requestKey = token && userId != null ? `${userId}|${role}|${rosterLimit ?? ''}|${reloadCount}` : null;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const loading = requestKey === null || settledKey !== requestKey;

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    fetch(`${backendBase}/api/v1/users/${userId}/characters?role=${role}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const next = selectOwnedRoster(data.data || [], rosterLimit);
        setReleaseOrder(next.releaseOrder);
        setCharacters(next.characters);
      })
      .catch((err: unknown) => logger.error(`Failed to load owned ${role.toLowerCase()}s:`, err))
      .finally(() => !cancelled && setSettledKey(requestKey));
    return () => {
      cancelled = true;
    };
  }, [requestKey, userId, role, rosterLimit]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { characters, loading, releaseOrder, reload };
}

/**
 * Original mode caps its roster at the source challenge's cutoff; see
 * `useOwnedRoster` for how `rosterLimit` is applied.
 */
export function useOwnedCharacters(role: Role, rosterLimit?: number) {
  return useOwnedRoster(role === 'killer' ? 'Killer' : 'Survivor', rosterLimit);
}

/** Owned killer names in release order (thin wrapper over the shared roster hook). */
export function useOwnedKillers() {
  const { characters, loading, releaseOrder, reload } = useOwnedRoster('Killer');
  const killers = useMemo(() => characters.map((c) => c.name), [characters]);
  return { killers, loading, releaseOrder, reload };
}
