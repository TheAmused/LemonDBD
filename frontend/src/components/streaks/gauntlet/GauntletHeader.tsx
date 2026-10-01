'use client';
// frontend/src/components/streaks/gauntlet/GauntletHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Role } from '@/types/gauntletStreak';
import { BookOpen, Gauge } from 'lucide-react';
import { StreakHeader, type StreakHeaderAction } from '../StreakHeader';

export interface GauntletHeaderProps {
  role: Role;
  currentStreak: number;
  bestStreak: number;
  lastCheckpointStreak: number;
  poolFrozen?: boolean;
  /** The lemon variant's label (e.g. "Duo"), shown next to the title. Omit for Original. */
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
  role,
  currentStreak,
  bestStreak,
  lastCheckpointStreak,
  poolFrozen = false,
  modeLabel,
  onOpenStats,
  onOpenHistory,
  onOpenRules,
  onOpenReset,
  onChangeMode,
  dict,
}) => {
  const s = dict?.streaks;
  const actions: StreakHeaderAction[] = [
    { key: 'rules', label: s?.rules || 'Rules', icon: <BookOpen className="w-4 h-4" />, onClick: onOpenRules },
  ];
  if (onChangeMode) {
    actions.push({ key: 'mode', label: s?.changeMode || 'Change Mode', icon: <Gauge className="w-4 h-4" />, onClick: onChangeMode });
  }

  return (
    <StreakHeader
      variant="compact"
      imageSrc="/images/streaks/gauntlet-streak.webp"
      title={
        <>
          <span className="capitalize">{s?.[role] || role}</span> {s?.gauntlet || 'Gauntlet'}
        </>
      }
      titleBadge={modeLabel}
      poolFrozen={poolFrozen}
      stats={[
        { key: 'current', label: s?.current || 'Current', value: currentStreak },
        { key: 'best', label: s?.best || 'Best', value: bestStreak },
        { key: 'checkpoint', label: s?.checkpointHeader || 'Checkpoint', value: lastCheckpointStreak },
      ]}
      actions={actions}
      onOpenStats={onOpenStats}
      onOpenHistory={onOpenHistory}
      onOpenReset={onOpenReset}
      dict={dict}
    />
  );
};
