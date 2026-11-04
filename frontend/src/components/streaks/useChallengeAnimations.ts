'use client';
// frontend/src/components/streaks/useChallengeAnimations.ts

import { useCallback } from 'react';
import { usePreferences } from '@/hooks/usePreferences';

/**
 * Whether the random draws (reels, slot machine, token roulette) play their animation.
 * This is the site-wide "Interactive Animations" setting, so the switch in a challenge header and the
 * one in the settings page are the same switch, for every challenge and for the rest of the site.
 */
export function useChallengeAnimations(): [boolean, (enabled: boolean) => void] {
  const { preferences, updatePreferences } = usePreferences();
  const setEnabled = useCallback(
    (next: boolean) => {
      void updatePreferences({ effects: next });
    },
    [updatePreferences]
  );
  return [preferences.effects, setEnabled];
}
