'use client';
// frontend/src/components/smash-or-pass/SmashAnimations.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Flame, Skull, Zap } from 'lucide-react';
import { createBurst, renderBurstFrame, type BurstKind } from './smashBurst';
import { useDictionary } from "@/context/DictionaryContext";

/** Stretches a layer over its parent and centres what is in it. */
const FILL_CENTER = 'absolute inset-0 flex items-center justify-center';

export interface SmashAnimationsProps {
  triggerType: BurstKind | null;
  triggerKey: number; // Incrementing key to re-trigger
  originX?: number;
  originY?: number;
}

/** Two votes closer together than this count as fast voting. */
const RAPID_VOTE_MS = 900;

export const SmashAnimations: React.FC<SmashAnimationsProps> = ({ triggerType, triggerKey, originX, originY }) => {
  const dict = useDictionary();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<BurstKind | null>(null);
  const [chromaticShift, setChromaticShift] = useState(false);
  const lastTriggerAtRef = useRef(0);

  const smashLabel = dict.smashOrPass.controls.smash;
  const superSmashLabel =
    dict.smashOrPass.controls.superSmash;
  const passLabel = dict.smashOrPass.controls.pass;

  useEffect(() => {
    if (!triggerType) return;

    // Voting fast: the full-screen flash and filter are what make the page stutter, and nobody
    // can read them at this pace anyway -- the lighter burst below is all a swipe gets.
    const now = performance.now();
    const rapid = now - lastTriggerAtRef.current < RAPID_VOTE_MS;
    lastTriggerAtRef.current = now;

    setActiveOverlay(rapid ? null : triggerType);
    setChromaticShift(!rapid);

    const shiftTimer = setTimeout(() => setChromaticShift(false), 240);
    const overlayTimer = setTimeout(() => setActiveOverlay(null), 450);

    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        clearTimeout(shiftTimer);
        clearTimeout(overlayTimer);
      };
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return () => {
        clearTimeout(shiftTimer);
        clearTimeout(overlayTimer);
      };
    }

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const burst = createBurst(triggerType, originX ?? width / 2, originY ?? height / 2, width, height, rapid);

    let animationFrame = 0;
    const render = () => {
      if (renderBurstFrame(ctx, burst, width, height)) animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      clearTimeout(shiftTimer);
      clearTimeout(overlayTimer);
      cancelAnimationFrame(animationFrame);
    };
  }, [triggerKey, triggerType, originX, originY]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        chromaticShift
          ? 'backdrop-blur-hairline filter drop-shadow-[-3px_0_0_var(--accent-red)] drop-shadow-[3px_0_0_var(--text-muted)]'
          : ''
      }`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Screen Vignette Overlay: SMASH */}
      {activeOverlay === 'smash' && (
        <div className="absolute inset-0 bg-radial from-accent-red/20 via-bg-elevated/10 to-transparent animate-out fade-out duration-400">
          <div className={FILL_CENTER}>
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-200">
              <div className="relative flex items-center justify-center">
                <Heart className="h-16 w-16 sm:h-20 sm:w-20 text-accent-red fill-accent-red drop-shadow-glow-red-lg animate-pulse" />
                <Skull className="absolute h-8 w-8 sm:h-10 sm:w-10 text-bg-primary/80 drop-shadow" />
              </div>
              <span className="text-xl sm:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-accent-red-hover via-accent-red to-accent-red-hover drop-shadow-glow-red-md">
                {smashLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Screen Vignette Overlay: SUPER SMASH */}
      {activeOverlay === 'super_smash' && (
        <div className="absolute inset-0 bg-radial from-accent-amber/25 via-accent-red/15 to-bg-primary/30 animate-out fade-out duration-450">
          <div className={FILL_CENTER}>
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-200">
              <div className="relative flex items-center justify-center">
                <Flame className="h-20 w-20 sm:h-24 sm:w-24 text-accent-amber fill-accent-amber drop-shadow-glow-amber-lg animate-bounce" />
                <Zap className="absolute h-10 w-10 sm:h-12 sm:w-12 text-accent-red fill-accent-red drop-shadow-glow-red-md animate-pulse" />
              </div>
              <span className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-accent-amber via-accent-amber-hover to-accent-red drop-shadow-glow-amber-md">
                {superSmashLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Screen Vignette Overlay: PASS */}
      {activeOverlay === 'pass' && (
        <div className="absolute inset-0 bg-radial from-text-muted/15 via-bg-primary/40 to-transparent animate-out fade-out duration-350">
          <div className={FILL_CENTER}>
            <div className="flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-150 opacity-90">
              <Skull className="h-16 w-16 sm:h-20 sm:w-20 text-text-muted drop-shadow-glow-muted-md" />
              <span className="text-lg sm:text-xl font-black uppercase tracking-widest text-text-muted drop-shadow">
                {passLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
