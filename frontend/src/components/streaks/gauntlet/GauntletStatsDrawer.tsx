'use client';
// frontend/src/components/streaks/gauntlet/GauntletStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { GauntletStats, MatchLog } from '@/types/gauntletStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from "@/context/DictionaryContext";

export interface GauntletStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GauntletStats | null;
  attempts?: number;
}

export const GauntletStatsDrawer: React.FC<GauntletStatsDrawerProps> = ({ isOpen, onClose, stats, attempts }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<MatchLog>
    isOpen={isOpen}
    onClose={onClose}
    stats={stats}
    attempts={attempts}
    renderLabel={(log: MatchLog) => (
      <div className="text-base font-bold text-text-primary">{characterDisplayName(log.character_id)}</div>
    )}
    renderMeta={(log: MatchLog) => (
      <span>
        {dict.streaks.streakLabel} {log.streak_after}
      </span>
    )}
  />
  );
};
