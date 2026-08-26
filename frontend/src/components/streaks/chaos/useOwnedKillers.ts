// frontend/src/components/streaks/chaos/useOwnedKillers.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { sortByReleaseNumber } from '@/utils/characterUtils';
import { backendBase } from '@/utils/staticUrl';

export function useOwnedKillers() {
  const { token, user } = useAuth();
  const [killers, setKillers] = useState<string[]>([]);
  // Release order for every killer, not just currently-owned ones -- a
  // killer frozen into a run's pool and later locked still needs its real
  // chronological slot instead of falling back to "unknown" (sorted last)
  // once it drops out of the owned-only list above.
  const [releaseOrder, setReleaseOrder] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/users/${user.id}/characters?role=Killer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const all = data.data || [];
        const sortedAll = sortByReleaseNumber(all);
        setReleaseOrder(new Map(sortedAll.map((c: any, i: number) => [c.name, i])));

        const owned = all.filter((c: any) => c.is_owned);
        setKillers(sortByReleaseNumber(owned).map((c: any) => c.name));
      }
    } catch (err) {
      console.error('Failed to load owned killers:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    load();
  }, [load]);

  return { killers, loading, releaseOrder, reload: load };
}
