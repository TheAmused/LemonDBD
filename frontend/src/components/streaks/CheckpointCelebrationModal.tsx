'use client';
// frontend/src/components/streaks/CheckpointCelebrationModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

export interface CheckpointCelebrationModalProps {
  checkpoint: number | null;
  onClose: () => void;
  dict?: Dictionary;
}

const SPARK_COUNT = 10;

/** Sparks fly out from the trophy at evenly spread angles, each a little off-beat. */
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, i) => {
  const angle = (i / SPARK_COUNT) * Math.PI * 2 + 0.3;
  const radius = 62 + (i % 3) * 14;
  return {
    dx: Math.round(Math.cos(angle) * radius),
    dy: Math.round(Math.sin(angle) * radius),
    delay: (i % 5) * 160,
    size: 4 + (i % 3) * 2,
  };
});

/** Counts up from 0 to `target` so the number lands after the trophy does. Jumps straight there under reduced motion. */
function useCountUp(target: number | null, durationMs = 900, delayMs = 450) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    setValue(0);
    let frame = 0;
    let startedAt = 0;
    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs, delayMs]);

  return value;
}

/** Shown when a win banks a checkpoint. Shared by every challenge that has them. */
export const CheckpointCelebrationModal: React.FC<CheckpointCelebrationModalProps> = ({
  checkpoint,
  onClose,
  dict,
}) => {
  const counted = useCountUp(checkpoint);

  useEffect(() => {
    if (checkpoint == null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkpoint, onClose]);

  if (checkpoint == null) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkpoint-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 p-4 backdrop-blur-md cursor-pointer select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ck-card-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-accent-amber/60 bg-gradient-to-b from-accent-amber/20 via-bg-surface to-bg-primary px-8 pb-8 pt-10 text-center shadow-[0_0_60px_-12px_var(--accent-amber)] cursor-default"
      >
        <div
          aria-hidden="true"
          className="ck-rays pointer-events-none absolute left-1/2 top-[88px] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 opacity-40"
        />

        <div className="relative mx-auto h-24 w-24" aria-hidden="true">
          <span className="ck-ring absolute inset-0 rounded-full border-2 border-accent-amber" />
          <span className="ck-ring absolute inset-0 rounded-full border-2 border-accent-amber" style={{ animationDelay: '900ms' }} />
          {SPARKS.map((spark, i) => (
            <span
              key={i}
              className="ck-spark absolute left-1/2 top-1/2 rounded-full bg-accent-amber"
              style={
                {
                  width: spark.size,
                  height: spark.size,
                  marginLeft: -spark.size / 2,
                  marginTop: -spark.size / 2,
                  animationDelay: `${600 + spark.delay}ms`,
                  '--ck-dx': `${spark.dx}px`,
                  '--ck-dy': `${spark.dy}px`,
                } as React.CSSProperties
              }
            />
          ))}
          <div className="ck-trophy-pop relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent-amber bg-gradient-to-br from-accent-amber to-accent-amber-hover text-text-inverted shadow-[0_0_34px_var(--accent-amber)]">
            <Trophy className="h-12 w-12" />
          </div>
        </div>

        <p className="ck-shine-text relative mt-6 bg-gradient-to-r from-accent-amber via-text-primary to-accent-amber bg-clip-text text-xs font-black uppercase tracking-[0.25em] text-transparent">
          {dict?.streaks?.checkpointSecured || 'Checkpoint secured'}
        </p>
        <h2
          id="checkpoint-modal-title"
          className="relative mt-2 font-mono text-5xl font-black tracking-tight text-text-primary"
        >
          {counted}
          <span className="ml-2 text-lg font-bold text-text-secondary">{dict?.streaks?.winsSuffix || 'wins'}</span>
        </h2>
        <p className="relative mt-3 text-sm text-text-secondary">
          {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'}{' '}
          <strong className="font-mono text-accent-amber">{checkpoint}</strong>.
        </p>
      </div>
    </div>
  );
};
