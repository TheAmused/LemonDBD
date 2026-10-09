// frontend/src/components/smash-or-pass/hub/useSmashSound.ts
import { useCallback, useEffect, useState } from 'react';
import { SmashSounds } from '../SmashSoundEffects';

const FIRST_GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;

/** The master sound switch, plus resuming audio on the first user gesture if it is enabled. */
export function useSmashSound() {
  const [isSoundActive, setIsSoundActive] = useState<boolean>(!SmashSounds.getIsMuted());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFirstUserGesture = () => {
      SmashSounds.handleUserInteraction();
    };
    for (const type of FIRST_GESTURE_EVENTS) {
      window.addEventListener(type, handleFirstUserGesture, { once: true });
    }
    return () => {
      for (const type of FIRST_GESTURE_EVENTS) {
        window.removeEventListener(type, handleFirstUserGesture);
      }
    };
  }, []);

  const toggleSound = useCallback(() => {
    setIsSoundActive(SmashSounds.toggleMasterSound());
  }, []);

  return { isSoundActive, toggleSound };
}
