// frontend/src/components/smash-or-pass/card/useCardFlip.ts
import { useCallback, useEffect, useState } from 'react';

/** Half of the turn: the card goes edge-on, swaps faces, and comes back. */
const FLIP_HALF_MS = 190;

type Turn = 'settled' | 'out' | 'far';

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
      const raf = requestAnimationFrame(() => setTurn('settled'));
      return () => cancelAnimationFrame(raf);
    }
  }, [turn]);

  /** The rotation of the turning wrapper, and whether to animate to it. */
  const turnStyle = {
    transform: turn === 'out' ? 'rotateY(90deg)' : turn === 'far' ? 'rotateY(-90deg)' : 'rotateY(0deg)',
    transition: turn === 'far' ? 'none' : `transform ${FLIP_HALF_MS}ms ease-in-out`,
  };

  return { isFlipped, startFlip, turnStyle };
}
