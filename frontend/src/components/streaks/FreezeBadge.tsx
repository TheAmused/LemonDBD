'use client';
// frontend/src/components/streaks/FreezeBadge.tsx
import type { Dictionary } from '@/locales/types';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Snowflake } from 'lucide-react';

export interface FreezeBadgeProps {
  frozen: boolean;
  /** Matches the slim single-line stat chips instead of the default square icon button. */
  compact?: boolean;
  dict?: Dictionary;
}

export const FreezeBadge: React.FC<FreezeBadgeProps> = ({ frozen, compact = false, dict }) => {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!frozen) return null;

  const rect = ref.current?.getBoundingClientRect();

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`freeze-badge-in flex items-center justify-center rounded-xl bg-bg-elevated border border-accent-amber/30 text-accent-amber shadow-sm ${
        compact ? 'px-3 py-2' : 'px-3.5 py-3'
      }`}
    >
      <Snowflake className={compact ? 'w-5 h-5 text-accent-amber' : 'w-6 h-6 text-accent-amber'} />

      {hovered &&
        rect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: rect.bottom + 8,
              left: Math.max(12, Math.min(window.innerWidth - 236, rect.left + rect.width / 2 - 112)),
            }}
            className="pointer-events-none w-56 z-[99999] rounded-xl border border-accent-amber/30 bg-bg-surface px-3 py-2.5 text-[11px] leading-snug text-text-secondary shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          >
            <span className="font-bold text-accent-amber">
              {dict?.streaks?.challengeStarted || 'Challenge started.'}
            </span>{' '}
            {dict?.streaks?.freezeNotice ||
              "Unlocking or locking perks/characters won't affect this run until a win, a loss back to 0, or a reset."}
          </div>,
          document.body
        )}
    </div>
  );
};
