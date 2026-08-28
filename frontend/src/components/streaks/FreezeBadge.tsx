'use client';
// frontend/src/components/streaks/FreezeBadge.tsx
import type { Dictionary } from '@/locales/types';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Snowflake } from 'lucide-react';

export interface FreezeBadgeProps {
  frozen: boolean;
  dict?: Dictionary;
}

export const FreezeBadge: React.FC<FreezeBadgeProps> = ({ frozen, dict }) => {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!frozen) return null;

  const rect = ref.current?.getBoundingClientRect();

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="freeze-badge-in flex items-center justify-center px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-sm"
    >
      <Snowflake className="w-6 h-6 text-sky-500 dark:text-sky-400" />

      {hovered &&
        rect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: rect.bottom + 8,
              left: Math.max(12, Math.min(window.innerWidth - 236, rect.left + rect.width / 2 - 112)),
              width: 224,
              zIndex: 99999,
            }}
            className="pointer-events-none rounded-xl border border-sky-500/30 bg-slate-950/95 px-3 py-2.5 text-[11px] leading-snug text-slate-200 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          >
            <span className="font-bold text-sky-400">
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
