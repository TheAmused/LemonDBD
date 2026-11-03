// frontend/src/components/generator/shared/useJackpotCelebration.ts
'use client';

import { useCallback } from 'react';
import { playFanfare } from '@/utils/perkAudio';

/** What happens when a loadout is finished: the fanfare. No particle burst on this page. */
export function useJackpotCelebration() {
  const celebrate = useCallback(() => {
    playFanfare();
  }, []);

  return { celebrate };
}
