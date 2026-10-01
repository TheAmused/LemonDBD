'use client';
// frontend/src/components/streaks/gauntlet/GauntletStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { GauntletStats, MatchLog } from '@/types/gauntletStreak';
import { StreakStatsDrawer, streakAtResult } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

export interface GauntletStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GauntletStats | null;
  attempts?: number;
  dict?: Dictionary;
}

export const GauntletStatsDrawer: React.FC<GauntletStatsDrawerProps> = ({ isOpen, onClose, stats, attempts, dict }) => {
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<MatchLog>
    isOpen={isOpen}
    onClose={onClose}
    accent="amber"
    stats={stats}
    attempts={attempts}
    dict={dict}
    renderLabel={(log: MatchLog) => (
      <div className="text-base font-bold text-text-primary">{characterDisplayName(log.character_id)}</div>
    )}
    renderMeta={(log: MatchLog) => (
      <span>
        {dict?.streaks?.streakLabel || 'Streak:'} {streakAtResult(log)}
      </span>
    )}
  />
  );
};