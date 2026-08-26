// frontend/src/components/streaks/FreezeBadge.tsx
'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Snowflake } from 'lucide-react';

export interface FreezeBadgeProps {
  frozen: boolean;
}

/**
 * Tile matching the header's Streak/Best stats, shown only once a run's
 * pool has locked in for the attempt. The explainer bubble is portaled to
 * document.body (like UnifiedHoverModal) so it always paints above the rest
 * of the header instead of fighting a local stacking context.
 */
export const FreezeBadge: React.FC<FreezeBadgeProps> = ({ frozen }) => {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!frozen) return null;

  const rect = ref.current?.getBoundingClientRect();

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="freeze-badge-in flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-sm"
    >
      <Snowflake className="w-5 h-5 text-sky-500 dark:text-sky-400" />
      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
        Frozen
      </span>

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
            <span className="font-bold text-sky-400">Challenge started.</span>{' '}
            Unlocking or locking perks/characters won&apos;t affect this run until a win, a loss back to 0, or a reset.
          </div>,
          document.body
        )}
    </div>
  );
};
