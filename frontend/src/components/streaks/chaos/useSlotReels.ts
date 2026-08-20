// frontend/src/components/streaks/chaos/useSlotReels.ts
'use client';

import { useCallback, useRef, useState } from 'react';

export const REEL_SPIN_MS = [900, 1150, 1400, 1650];

export type ReelDirection = 'up' | 'down';

export function useSlotReels(reelCount = 4) {
  const [spinToken, setSpinToken] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const landedCountRef = useRef(0);
  const onDoneRef = useRef<(() => void) | null>(null);

  const start = useCallback((onDone: () => void) => {
    landedCountRef.current = 0;
    onDoneRef.current = onDone;
    setIsSpinning(true);
    setSpinToken((t) => t + 1);
  }, []);

  const reportLanded = useCallback(() => {
    landedCountRef.current += 1;
    if (landedCountRef.current >= reelCount) {
      setIsSpinning(false);
      onDoneRef.current?.();
      onDoneRef.current = null;
    }
  }, [reelCount]);

  return { spinToken, isSpinning, start, reportLanded };
}
