'use client';
// frontend/src/components/smash-or-pass/hub/CalmVoteMark.tsx
import { useEffect, useState } from 'react';
import { Heart, Skull } from 'lucide-react';

interface CalmVoteMarkProps {
  triggerType: 'smash' | 'pass' | 'super_smash' | null;
  triggerKey: number;
}

/** How long the mark is up before it fades; the fade itself is the CSS transition. */
const HOLD_MS = 220;

/**
 * What a vote shows with effects switched off: a heart for a smash, a skull for a pass, at the
 * centre of the screen. It only fades in and out -- no glow, flash, pulse, burst or movement.
 */
export function CalmVoteMark({ triggerType, triggerKey }: CalmVoteMarkProps) {
  const [shown, setShown] = useState<'smash' | 'pass' | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!triggerType) return;
    setShown(triggerType === 'pass' ? 'pass' : 'smash');
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), HOLD_MS);
    return () => clearTimeout(timer);
  }, [triggerKey, triggerType]);

  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden="true">
      <div className={`transition-opacity duration-300 ease-in-out ${visible ? 'opacity-90' : 'opacity-0'}`}>
        {shown === 'smash' ? (
          <Heart className="h-20 w-20 sm:h-24 sm:w-24 fill-accent-red text-accent-red" />
        ) : (
          <Skull className="h-20 w-20 sm:h-24 sm:w-24 text-text-muted" />
        )}
      </div>
    </div>
  );
}
