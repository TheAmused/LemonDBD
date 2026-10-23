// frontend/src/components/streaks/chaos/useKillerPerkPool.ts
'use client';

import { logger } from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import type { Perk } from '@/types/gauntletStreak';
import { useAuth } from '@/context/AuthContext';
import { backendBase } from '@/utils/staticUrl';

export function useKillerPerkPool() {
  const { token, user } = useAuth();
  const [pool, setPool] = useState<Perk[]>([]);
  const userId = user?.id;
  const [reloadCount, setReloadCount] = useState(0);
  // Loading until the request for this account has settled (and while signed out).
  const requestKey = token && userId != null ? `${userId}|${reloadCount}` : null;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const loading = requestKey === null || settledKey !== requestKey;

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    fetch(`${backendBase}/api/v1/users/${userId}/perks?category=Killer`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setPool((data.data || []).filter((p: { is_unlocked?: boolean }) => p.is_unlocked));
      })
      .catch((err: unknown) => logger.error('Failed to load killer perk pool:', err))
      .finally(() => !cancelled && setSettledKey(requestKey));
    return () => {
      cancelled = true;
    };
  }, [requestKey, userId]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { pool, loading, reload };
}
