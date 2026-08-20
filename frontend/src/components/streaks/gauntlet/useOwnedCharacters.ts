// frontend/src/components/streaks/gauntlet/useOwnedCharacters.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role } from '@/types/gauntletStreak';
import { useAuth } from '@/context/AuthContext';

export interface OwnedCharacterItem {
  name: string;
  avatar_local_path?: string;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
        let owned = (data.data || []).filter((c: any) => c.is_owned);
        if (rosterLimit != null) {
          owned = owned.filter((c: any) => c.release_number == null || c.release_number <= rosterLimit);
        }
        owned = [...owned].sort(
          (a: any, b: any) => (a.release_number ?? Infinity) - (b.release_number ?? Infinity)
        );
        setCharacters(owned.map((c: any) => ({ name: c.name })));
      }
    } catch (err) {
      console.error('Failed to load owned characters:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user, role, rosterLimit]);

  useEffect(() => {
    load();
  }, [load]);

  return { characters, loading, reload: load };
}
