// frontend/src/components/smash-or-pass/hub/useCardExit.ts
import { useCallback, useRef, useState } from 'react';

/** Matches the card's own exit transition. */
const EXIT_MS = 480;
/** With effects off the card still leaves smoothly -- a gentle fade, no fling -- a little quicker. */
export const CALM_EXIT_MS = 320;

export interface DragPhysics {
  x: number;
  y: number;
  isDragging: boolean;
}

type Offset = { x: number; y: number };

/** Where the voted card flies to: on from the drag it was let go in, or straight off to its side. */
export function exitOffsetFor(vote: 'smash' | 'pass', drag: DragPhysics): Offset {
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  if (drag.x !== 0 || drag.y !== 0) {
    return {
      x: drag.x > 0 ? screenWidth * 1.25 : -screenWidth * 1.25,
      y: drag.y * 1.1,
    };
  }
  return vote === 'smash'
    ? { x: screenWidth * 1.25, y: -20 }
    : { x: -screenWidth * 1.25, y: 20 };
}

/** The top card's drag, and the single-card exit animation that follows a vote. */
export function useCardExit() {
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [exitVote, setExitVote] = useState<'smash' | 'pass' | null>(null);
  const [exitOffset, setExitOffset] = useState<Offset | undefined>(undefined);
  const [dragPhysics, setDragPhysics] = useState<DragPhysics>({ x: 0, y: 0, isDragging: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Clears the exit flags only -- a fresh feed lands with the drag already settled. */
  const resetExit = useCallback(() => {
    setIsExiting(false);
    setExitVote(null);
    setExitOffset(undefined);
  }, []);

  const finishExit = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    resetExit();
    setDragPhysics({ x: 0, y: 0, isDragging: false });
  }, [resetExit]);

  const beginExit = useCallback((vote: 'smash' | 'pass', offset: Offset, onElapsed: () => void, durationMs: number = EXIT_MS) => {
    setIsExiting(true);
    setExitVote(vote);
    setExitOffset(offset);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(onElapsed, durationMs);
  }, []);

  return { isExiting, exitVote, exitOffset, dragPhysics, setDragPhysics, resetExit, finishExit, beginExit };
}
