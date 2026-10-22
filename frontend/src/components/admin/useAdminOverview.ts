'use client';
// frontend/src/components/admin/useAdminOverview.ts
//
// The admin panel's counts (users per role and standing, pending reports). One small request, made
// when the panel opens and again after anything that changes those counts.
import { logger } from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import { fetchOverview } from '@/services/adminApi';
import type { AdminOverview } from '@/types/admin';

export function useAdminOverview(enabled: boolean) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const refresh = useCallback(
    () =>
      fetchOverview().then(setOverview, (err: unknown) => {
        logger.error('Failed to load the admin overview:', err);
      }),
    []
  );

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { overview, refresh };
}
