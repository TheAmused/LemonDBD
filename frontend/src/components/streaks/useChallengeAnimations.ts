'use client';
// frontend/src/components/streaks/useChallengeAnimations.ts

import { useCallback, useSyncExternalStore } from 'react';
import { getSavedChallengeAnimations, saveChallengeAnimations } from '@/utils/streakDifficultyPrefs';

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab flipping the switch should carry over too.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Whether the random draws (reels, slot machine, token roulette) play their animation. Shared by every challenge. */
export function useChallengeAnimations(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, getSavedChallengeAnimations, () => true);
  const setEnabled = useCallback((next: boolean) => {
    saveChallengeAnimations(next);
    listeners.forEach((notify) => notify());
  }, []);
  return [enabled, setEnabled];
}
