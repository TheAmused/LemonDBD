// frontend/src/components/streaks/gauntlet/useOwnedCharacters.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role } from '@/types/gauntletStreak';
import { useAuth } from '@/context/AuthContext';
import { sortByReleaseNumber } from '@/utils/characterUtils';
import { backendBase } from '@/utils/staticUrl';

export interface OwnedCharacterItem {
  name: string;
  avatar_local_path?: string;
}

/**
 * Original mode caps its roster at the source challenge's cutoff. `rosterLimit`
 * comes from the gauntlet run's tier_info, the backend's own
 * ORIGINAL_KILLER_ROSTER_LIMIT / ORIGINAL_SURVIVOR_ROSTER_LIMIT, so this hook
 * carries no copy of the number itself. Until that value has loaded, the
 * roster is shown unfiltered rather than guessed at.
 */
export function useOwnedCharacters(role: Role, rosterLimit?: number) {
  const { token, user } = useAuth();
  const [characters, setCharacters] = useState<OwnedCharacterItem[]>([]);
  const [releaseOrder, setReleaseOrder] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const dbRole = role === 'killer' ? 'Killer' : 'Survivor';
      const res = await fetch(`${backendBase}/api/v1/users/${user.id}/characters?role=${dbRole}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const all = data.data || [];
        const sortedAll = sortByReleaseNumber(all);
        setReleaseOrder(new Map(sortedAll.map((c: any, i: number) => [c.name, i])));

        let owned = all.filter((c: any) => c.is_owned);
        if (rosterLimit != null) {
          owned = owned.filter((c: any) => c.release_number == null || c.release_number <= rosterLimit);
        }
        setCharacters(sortByReleaseNumber(owned).map((c: any) => ({ name: c.name })));
      }
    } catch (err) {
      console.error('Failed to load owned characters:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, role, rosterLimit]);

  useEffect(() => {
    load();
  }, [load]);

  return { characters, loading, releaseOrder, reload: load };
}
