'use client';
// frontend/src/components/smash-or-pass/card/useCardFlip.ts
import { useCallback, useEffect, useState } from 'react';

/** Half of the turn: the card goes edge-on, swaps faces, and comes back. */
const FLIP_HALF_MS = 190;

type Turn = 'settled' | 'out' | 'far' | 'back';

/** Which face is up, and the two-halves turn between them. A new character starts face up. */
export function useCardFlip(slug: string | undefined, id: string | number | undefined) {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [turn, setTurn] = useState<Turn>('settled');

  useEffect(() => {
    setIsFlipped(false);
    setTurn('settled');
  }, [slug, id]);

  const startFlip = useCallback(() => {
    setTurn((t) => (t === 'settled' ? 'out' : t));
  }, []);

  useEffect(() => {
    if (turn === 'out') {
      const timer = setTimeout(() => {
        setIsFlipped((v) => !v);
        setTurn('far');
      }, FLIP_HALF_MS);
      return () => clearTimeout(timer);
    }
    if (turn === 'far') {
      // Next frame, so the jump to the far edge paints before the return is animated.
      const raf = requestAnimationFrame(() => setTurn('back'));
      return () => cancelAnimationFrame(raf);
    }
    if (turn === 'back') {
      // The return half is still animating: stay "turned" until it lands, or the cards queued
      // behind flash through the narrowing, edge-on card on the way back to face up.
      const timer = setTimeout(() => setTurn('settled'), FLIP_HALF_MS);
      return () => clearTimeout(timer);
    }
  }, [turn]);

  /** The rotation of the turning wrapper, and whether to animate to it. */
  const turnStyle = {
    transform: turn === 'out' ? 'rotateY(90deg)' : turn === 'far' ? 'rotateY(-90deg)' : 'rotateY(0deg)',
    transition: turn === 'far' ? 'none' : `transform ${FLIP_HALF_MS}ms ease-in-out`,
  };

  /** True from the first frame of a turn until the card is back face up, so nothing shows through the edge-on card. */
  const isTurned = isFlipped || turn !== 'settled';

  return { isFlipped, isTurned, startFlip, turnStyle };
}
