'use client';

import React from 'react';
import { cn } from '@/utils/cn';

export type IconButtonTone = 'amber' | 'cyan' | 'purple' | 'fuchsia' | 'red';

const TONE_STYLES: Record<IconButtonTone, { text: string; activeBg: string; ring: string; bar: string }> = {
  amber: {
    text: 'text-amber-400',
    activeBg: 'bg-amber-500/10',
    ring: 'hover:shadow-[0_0_0_1px_rgba(245,158,11,0.4),0_0_14px_rgba(245,158,11,0.22)]',
    bar: 'from-transparent via-amber-400 to-transparent',
  },
  cyan: {
    text: 'text-cyan-400',
    activeBg: 'bg-cyan-500/10',
    ring: 'hover:shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_0_14px_rgba(34,211,238,0.22)]',
    bar: 'from-transparent via-cyan-400 to-transparent',
  },
  purple: {
    text: 'text-purple-400',
    activeBg: 'bg-purple-500/10',
    ring: 'hover:shadow-[0_0_0_1px_rgba(192,132,252,0.4),0_0_14px_rgba(192,132,252,0.22)]',
    bar: 'from-transparent via-purple-400 to-transparent',
  },
  fuchsia: {
    text: 'text-fuchsia-400',
    activeBg: 'bg-fuchsia-500/10',
    ring: 'hover:shadow-[0_0_0_1px_rgba(232,121,249,0.4),0_0_14px_rgba(232,121,249,0.22)]',
    bar: 'from-transparent via-fuchsia-400 to-transparent',
  },
  red: {
    text: 'text-red-400',
    activeBg: 'bg-red-500/10',
    ring: 'hover:shadow-[0_0_0_1px_rgba(248,113,113,0.4),0_0_14px_rgba(248,113,113,0.22)]',
    bar: 'from-transparent via-red-400 to-transparent',
  },
};

interface IconToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  onClick: () => void;
  className?: string;
  /** Gives this button its own accent color (icon, active tint, hover glow,
   * and the little accent bar along the bottom) instead of every toolbar
   * icon sharing the same neutral/amber look -- e.g. No-Repeat reads as
   * "cyan/tech", Blind Mode as "purple/cursed", Chaos as "fuchsia/mystic",
   * Reset as "red/sacrifice". Defaults to the app's usual amber. */
  tone?: IconButtonTone;
}

export const IconToggleButton: React.FC<IconToggleButtonProps> = ({
  icon,
  label,
  isActive = false,
  badge,
  onClick,
  className,
  tone = 'amber',
}) => {
  const t = TONE_STYLES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        'group/btn relative flex items-center gap-2 overflow-hidden rounded-lg px-3.5 py-3 min-h-[44px] touch-manipulation text-slate-500 dark:text-slate-400 transition-all duration-200 cursor-pointer hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800/50',
        // Notched top-left / bottom-right corners -- a small "trial sigil"
        // silhouette that reads as its own DBD-flavored shape instead of
        // the plain rounded rectangle used everywhere else in the toolbar.
        '[clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]',
        t.ring,
        isActive && cn(t.text, t.activeBg),
        className
      )}
    >
      {icon}
      {badge !== undefined && <span className="text-[11px] font-black">{badge}</span>}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-1.5 bottom-0.5 h-px bg-gradient-to-r opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100',
          isActive && 'opacity-100',
          t.bar
        )}
      />
    </button>
  );
};
