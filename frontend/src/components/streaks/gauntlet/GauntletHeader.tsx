'use client';
// frontend/src/components/streaks/gauntlet/GauntletHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Flame } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';
import { ChallengeHeaderLayout, ModeSelectButton, StandardHeaderActions, StatTile } from '../ChallengePanel';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

export interface GauntletHeaderProps {
  currentStreak: number;
  bestStreak: number;
  poolFrozen?: boolean;
  /** The lemon variant's label (e.g. "Duo"), shown as a badge. Omit for Original. */
  modeLabel?: string;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenRules: () => void;
  onOpenReset: () => void;
  /** Omit to hide the button, e.g. for a role with only one playable mode. */
  onChangeMode?: () => void;
  dict?: Dictionary;
}

export const GauntletHeader: React.FC<GauntletHeaderProps> = ({
  currentStreak,
  bestStreak,
  poolFrozen = false,
  modeLabel,
  onOpenStats,
  onOpenHistory,
  onOpenRules,
  onOpenReset,
  onChangeMode,
  dict,
}) => (
  <ChallengeHeaderLayout
    stats={
      <>
        <StatTile icon={<Flame className="h-5 w-5" />} label={dict?.streaks?.current || 'Current'} value={currentStreak} />
        <StatTile icon={<AdeptBadgeIcon className="h-5 w-5" />} label={dict?.streaks?.best || 'Best'} value={bestStreak} />
        <FreezeBadge frozen={poolFrozen} dict={dict} />
      </>
    }
    actions={
      <StandardHeaderActions
        onOpenRules={onOpenRules}
        onOpenStats={onOpenStats}
        onOpenHistory={onOpenHistory}
        onOpenReset={onOpenReset}
        dict={dict}
        extra={
          modeLabel && (
            <ModeSelectButton
              label={modeLabel}
              tone="amber"
              onClick={onChangeMode}
              title={dict?.streaks?.changeMode || 'Change Mode'}
            />
          )
        }
      />
    }
  />
);
