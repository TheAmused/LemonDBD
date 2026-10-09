// frontend/src/components/smash-or-pass/hub/useHubHotkeys.ts
import { useEffect } from 'react';
import type { EntityItem } from '@/types/smashOrPass';

interface UseHubHotkeysOptions {
  areModalsOpen: boolean;
  currentCharacter: EntityItem | null;
  isExiting: boolean;
  handleVote: (vote: 'smash' | 'pass') => void;
  toggleHowToPlay: () => void;
  openStats: (character: EntityItem) => void;
  openResetConfirm: () => void;
}

/**
 * Keyboard shortcuts. M/B (sound) and ?// (how to play) work anywhere; the deck keys -- A/Left to
 * pass, D/Right to smash, W/Up for stats, R to reset -- only when no modal is open and a candidate
 * is up and settled.
 */
export function useHubHotkeys({
  areModalsOpen,
  currentCharacter,
  isExiting,
  handleVote,
  toggleHowToPlay,
  openStats,
  openResetConfirm,
}: UseHubHotkeysOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Help
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        toggleHowToPlay();
      }

      // Deck voting keys (only when no modal is open and candidate is active)
      if (areModalsOpen || !currentCharacter || isExiting) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleVote('pass');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleVote('smash');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        openStats(currentCharacter);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        openResetConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [areModalsOpen, currentCharacter, isExiting, handleVote, toggleHowToPlay, openStats, openResetConfirm]);
}
