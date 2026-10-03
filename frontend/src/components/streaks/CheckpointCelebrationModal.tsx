'use client';
// frontend/src/components/streaks/CheckpointCelebrationModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useDictionary } from "@/context/DictionaryContext";

export interface CheckpointCelebrationModalProps {
  checkpoint: number | null;
  onClose: () => void;
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
export const CheckpointCelebrationModal: React.FC<CheckpointCelebrationModalProps> = ({ checkpoint, onClose }) => {
  const dict = useDictionary();
  const counted = useCountUp(checkpoint);

  return (
    <Modal
      isOpen={checkpoint != null}
      onClose={onClose}
      variant="lightbox"
      size="sm"
      closeButton="none"
      ariaLabel={dict.streaks.checkpointSecured}
    >
      <div
        className="ck-card-in relative w-full overflow-hidden rounded-3xl border border-accent-amber/60 bg-gradient-to-b from-accent-amber/20 via-bg-surface to-bg-primary flex min-h-[26rem] flex-col items-center justify-center px-8 py-14 text-center cursor-default"
      >
        <div className="relative mx-auto h-24 w-24" aria-hidden="true">
          <div
            aria-hidden="true"
            className="ck-rays pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 opacity-40"
          />

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

        <p className="ck-shine-text relative mt-6 bg-gradient-to-r from-accent-amber via-text-primary to-accent-amber bg-clip-text type-label-sm tracking-spaced-md text-transparent">
          {dict.streaks.checkpointSecured}
        </p>
        <h2
          className="relative mt-2 text-5xl font-black tracking-tight text-text-primary"
        >
          {counted}
          <span className="ml-2 text-lg font-bold text-text-secondary">{dict.streaks.winsSuffix}</span>
        </h2>
      </div>
    </Modal>
  );
};
