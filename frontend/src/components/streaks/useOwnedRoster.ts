// frontend/src/components/streaks/useOwnedRoster.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sortByReleaseNumber } from '@/utils/characterUtils';
import { backendBase } from '@/utils/staticUrl';

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
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/users/${user.id}/characters?role=${role}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const next = selectOwnedRoster(data.data || [], rosterLimit);
        setReleaseOrder(next.releaseOrder);
        setCharacters(next.characters);
      }
    } catch (err) {
      console.error(`Failed to load owned ${role.toLowerCase()}s:`, err);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, role, rosterLimit]);

  useEffect(() => {
    load();
  }, [load]);

  return { characters, loading, releaseOrder, reload: load };
}
