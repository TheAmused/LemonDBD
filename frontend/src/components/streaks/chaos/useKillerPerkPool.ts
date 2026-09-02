// frontend/src/components/streaks/chaos/useKillerPerkPool.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Perk } from '@/types/gauntletStreak';
import { useAuth } from '@/context/AuthContext';
import { backendBase } from '@/utils/staticUrl';

export function useKillerPerkPool() {
  const { token, user } = useAuth();
  const [pool, setPool] = useState<Perk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/api/v1/users/${user.id}/perks?category=Killer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const unlocked = (data.data || []).filter((p: any) => p.is_unlocked);
        setPool(unlocked);
      }
    } catch (err) {
      console.error('Failed to load killer perk pool:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { pool, loading, reload: load };
}
