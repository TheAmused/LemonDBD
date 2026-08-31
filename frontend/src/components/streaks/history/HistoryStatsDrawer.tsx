'use client';
// frontend/src/components/streaks/history/HistoryStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { HistoryStats, HistoryMatchLog } from '@/types/historyStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

export interface HistoryStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: HistoryStats | null;
  dict?: Dictionary;
}

export const HistoryStatsDrawer: React.FC<HistoryStatsDrawerProps> = ({ isOpen, onClose, stats, dict }) => {
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<HistoryMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    title={dict?.streaks?.historyStreak || 'History Streak'}
    accent="slate"
    stats={stats}
    dict={dict}
    renderLabel={(log) => (
      <div className="text-sm font-bold text-slate-900 dark:text-white">{characterDisplayName(log.killer_id)}</div>
    )}
    renderMeta={(log) => (
      <span>
        {dict?.streaks?.killersColonLabel || 'Killers:'} {log.streak_before}{' '}
        {dict?.streaks?.streakArrow || '→'} {log.streak_after} {dict?.streaks?.middotSeparator || '·'}{' '}
        {dict?.streaks?.rowLabel || 'Row'} {log.row_index + 1}
      </span>
    )}
  />
  );
};
