// frontend/src/components/smash-or-pass/card/useCardDrag.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { SmashSounds } from '../SmashSoundEffects';

const ZONE_THRESHOLD = 45;
const SWIPE_THRESHOLD = 110;

interface UseCardDragOptions {
  isTopCard: boolean;
  isExiting: boolean;
  isFlipped: boolean;
  initialExitOffset: { x: number; y: number } | null;
  onVote: (type: 'smash' | 'pass', origin?: { x: number; y: number }) => void;
  onDragUpdate?: (x: number, y: number, isDragging: boolean) => void;
}

type Tilt = { x: number; y: number; glossX: number; glossY: number };
const FLAT: Tilt = { x: 0, y: 0, glossX: 50, glossY: 50 };

/**
 * The top card's pointer behaviour: a gloss and tilt that follow the cursor, and a drag that
 * votes once it is let go past the swipe distance and springs back otherwise.
 */
export function useCardDrag({ isTopCard, isExiting, isFlipped, initialExitOffset, onVote, onDragUpdate }: UseCardDragOptions) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tilt, setTilt] = useState<Tilt>(FLAT);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDragZoneRef = useRef<'neutral' | 'smash' | 'pass'>('neutral');
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isExiting && initialExitOffset) {
      setDragOffset(initialExitOffset);
    }
  }, [isExiting, initialExitOffset]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTopCard || isDragging || isExiting || isFlipped || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setTilt({
      x: ((y - centerY) / centerY) * -8,
      y: ((x - centerX) / centerX) * 8,
      glossX: (x / rect.width) * 100,
      glossY: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt(FLAT);
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isTopCard || isExiting || isFlipped) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    touchStartRef.current = { x: clientX, y: clientY };
    lastDragZoneRef.current = 'neutral';
    setIsDragging(true);
    onDragUpdate?.(0, 0, true);
    SmashSounds.playCardGrabSound();
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDragging || !isTopCard || isExiting || isFlipped) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - touchStartRef.current.x;
      const deltaY = clientY - touchStartRef.current.y;

      setDragOffset({ x: deltaX, y: deltaY });
      onDragUpdate?.(deltaX, deltaY, true);

      if (deltaX > ZONE_THRESHOLD && lastDragZoneRef.current !== 'smash') {
        lastDragZoneRef.current = 'smash';
        SmashSounds.playSensualHover();
      } else if (deltaX < -ZONE_THRESHOLD && lastDragZoneRef.current !== 'pass') {
        lastDragZoneRef.current = 'pass';
        SmashSounds.playSadHover();
      } else if (Math.abs(deltaX) < 25 && lastDragZoneRef.current !== 'neutral') {
        lastDragZoneRef.current = 'neutral';
      }
    },
    [isDragging, isTopCard, isExiting, isFlipped, onDragUpdate]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !isTopCard || isExiting || isFlipped) return;
    setIsDragging(false);
    lastDragZoneRef.current = 'neutral';

    const voteFromCardCentre = (vote: 'smash' | 'pass') => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        onVote(vote, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      } else {
        onVote(vote);
      }
    };

    if (dragOffset.x > SWIPE_THRESHOLD) {
      voteFromCardCentre('smash');
    } else if (dragOffset.x < -SWIPE_THRESHOLD) {
      voteFromCardCentre('pass');
    } else {
      setDragOffset({ x: 0, y: 0 });
      onDragUpdate?.(0, 0, false);
      SmashSounds.playFlipSound();
    }
  }, [isDragging, isTopCard, isExiting, isFlipped, dragOffset, onVote, onDragUpdate]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTouchMove);
      window.addEventListener('mouseup', handleTouchEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  return { cardRef, dragOffset, tilt, isDragging, handleMouseMove, handleMouseLeave, handleTouchStart };
}
