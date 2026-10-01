'use client';
// frontend/src/components/streaks/history/HistoryStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryStats, HistoryMatchLog } from '@/types/historyStreak';
import { StreakStatsDrawer, streakAtResult } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

export interface HistoryStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: HistoryStats | null;
  attempts?: number;
  dict?: Dictionary;
}

export const HistoryStatsDrawer: React.FC<HistoryStatsDrawerProps> = ({ isOpen, onClose, stats, attempts, dict }) => {
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<HistoryMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    accent="amber"
    stats={stats}
    attempts={attempts}
    dict={dict}
    renderLabel={(log) => (
      <div className="text-sm font-bold text-text-primary">{characterDisplayName(log.killer_id)}</div>
    )}
    renderMeta={(log) => (
      <span>
        {dict?.streaks?.killersColonLabel || 'Killers:'} {streakAtResult(log)} {dict?.streaks?.middotSeparator || '·'}{' '}
        {dict?.streaks?.rowLabel || 'Row'} {log.row_index + 1}
      </span>
    )}
  />
  );
};
