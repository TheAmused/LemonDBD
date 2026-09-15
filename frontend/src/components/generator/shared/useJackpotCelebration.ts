// frontend/src/components/generator/shared/useJackpotCelebration.ts
'use client';

import { useCallback } from 'react';
import { playFanfare } from '@/utils/perkAudio';
import { triggerDbdBurst } from '../lib/dbdBurst';
import { RoleCategory } from '@/types/perks';

export function useJackpotCelebration() {
  const celebrate = useCallback((role: RoleCategory, originEl?: HTMLElement | null) => {
    playFanfare();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      triggerDbdBurst(originEl ?? null, role);
    }
  }, []);

  return { celebrate };
}
