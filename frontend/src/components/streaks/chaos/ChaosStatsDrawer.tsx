'use client';
// frontend/src/components/streaks/chaos/ChaosStatsDrawer.tsx

import React from 'react';
import type { ChaosStats, ChaosMatchLog } from '@/types/chaosStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

import { useDictionary } from "@/context/DictionaryContext";

export interface ChaosStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ChaosStats | null;
  attempts?: number;
}

export const ChaosStatsDrawer: React.FC<ChaosStatsDrawerProps> = ({ isOpen, onClose, stats, attempts }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<ChaosMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    stats={stats}
    attempts={attempts}
    renderLabel={(log) => (
      <div className="text-base font-bold text-text-primary">{characterDisplayName(log.killer_id)}</div>
    )}
    renderMeta={(log) => (
      <span>
        {log.result === 'win' && `${dict.streaks.streakLabel} ${log.streak_after}`}
      </span>
    )}
  />
  );
};
