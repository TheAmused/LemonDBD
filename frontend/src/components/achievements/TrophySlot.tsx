// frontend/src/components/achievements/TrophySlot.tsx
import React from 'react';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';
import { FullRosterLaurelIcon } from '@/components/icons/DbdIcons';

export type TrophyVariant = 'owned' | 'all';

interface TrophySlotProps {
  variant: TrophyVariant;
  badgeLabel: string;
  hoverText: string;
  unlocked?: boolean;
}

const VARIANT_ICON: Record<TrophyVariant, React.ElementType> = {
  owned: AdeptBadgeIcon,
  all: FullRosterLaurelIcon,
};

export const TrophySlot: React.FC<TrophySlotProps> = ({ variant, badgeLabel, hoverText, unlocked = false }) => {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      title={hoverText}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 w-24 transition-colors ${
        unlocked
          ? 'border-accent-amber/40 bg-accent-amber/10'
          : 'border-border-color bg-bg-surface'
      }`}
    >
      <Icon
        className={`h-9 w-9 ${
          unlocked ? 'text-accent-amber fill-accent-amber/20' : 'text-text-muted fill-text-muted/40'
        }`}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="text-center text-[9px] font-bold uppercase tracking-wider text-text-muted">
        {badgeLabel}
      </span>
    </div>
  );
};
