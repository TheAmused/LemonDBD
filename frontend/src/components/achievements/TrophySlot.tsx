// frontend/src/components/achievements/TrophySlot.tsx
import React from 'react';
import { Trophy, Crown, type LucideIcon } from 'lucide-react';

export type TrophyVariant = 'owned' | 'all';

interface TrophySlotProps {
  variant: TrophyVariant;
  badgeLabel: string;
  hoverText: string;
  unlocked?: boolean;
}

const VARIANT_ICON: Record<TrophyVariant, LucideIcon> = {
  owned: Trophy,
  all: Crown,
};

export const TrophySlot: React.FC<TrophySlotProps> = ({ variant, badgeLabel, hoverText, unlocked = false }) => {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      title={hoverText}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 w-24 transition-colors ${
        unlocked
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-slate-300/70 dark:border-slate-700/70 bg-slate-200/60 dark:bg-slate-800/60'
      }`}
    >
      <Icon
        className={`h-9 w-9 ${
          unlocked ? 'text-amber-500 fill-amber-500/20' : 'text-slate-500 dark:text-slate-600 fill-slate-500/40 dark:fill-slate-600/40'
        }`}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {badgeLabel}
      </span>
    </div>
  );
};
