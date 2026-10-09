// frontend/src/components/smash-or-pass/hub/useSmashSound.ts
import { useEffect } from 'react';
import { SmashSounds } from '../SmashSoundEffects';

const FIRST_GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;

/**
 * Audio housekeeping for the page: resumes it on the first user gesture, and stops the music when
 * the viewer leaves. Whether anything plays is the Effects / Music choice alone (see prefs/).
 */
export function useSmashSound() {
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
      // The music belongs to this page: it must not follow the viewer to /perks.
      SmashSounds.pauseBgm();
    };
  }, []);
}
