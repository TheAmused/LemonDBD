'use client';
// frontend/src/components/streaks/history/HistoryStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryStats, HistoryMatchLog } from '@/types/historyStreak';
import { StreakStatsDrawer, streakAtResult } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from "@/context/DictionaryContext";

export interface HistoryStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: HistoryStats | null;
  attempts?: number;
}

export const HistoryStatsDrawer: React.FC<HistoryStatsDrawerProps> = ({ isOpen, onClose, stats, attempts }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<HistoryMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    stats={stats}
    attempts={attempts}
    renderLabel={(log) => (
      <div className="text-base font-bold text-text-primary">{characterDisplayName(log.killer_id)}</div>
    )}
    renderMeta={(log) => (
      <span>
        {dict.streaks.killersColonLabel} {streakAtResult(log)} {dict.streaks.middotSeparator}{' '}
        {dict.streaks.rowLabel} {log.row_index + 1}
      </span>
    )}
  />
  );
};
