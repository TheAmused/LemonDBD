'use client';
// frontend/src/components/streaks/id-please/useIdPleaseEligibility.ts

import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchIdPleaseEligibility } from '@/services/idPleaseStreakApi';
import type { IdPleaseEligibility, IdPleaseLane } from '@/types/idPleaseStreak';

/** Which difficulties the signed-in account can play right now in a lane, for the mode picker. Null until loaded. */
export function useIdPleaseEligibility(lane: IdPleaseLane, enabled = true): IdPleaseEligibility | null {
  const { token } = useAuth();
  const [eligibility, setEligibility] = useState<IdPleaseEligibility | null>(null);

  useEffect(() => {
    if (!token || !enabled) return;
    let cancelled = false;
    fetchIdPleaseEligibility(lane, token)
      .then((loaded) => {
        if (!cancelled) setEligibility(loaded);
      })
      .catch((err: unknown) => logger.error('Failed to load ID, Please eligibility:', err));
    return () => {
      cancelled = true;
    };
  }, [token, lane, enabled]);

  return eligibility;
}
