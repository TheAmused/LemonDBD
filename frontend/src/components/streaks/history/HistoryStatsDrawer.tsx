// frontend/src/components/streaks/history/HistoryStatsDrawer.tsx
'use client';

import React from 'react';
import { HistoryStats, HistoryMatchLog } from '@/types/historyStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';

export interface HistoryStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: HistoryStats | null;
  dict?: any;
}

export const HistoryStatsDrawer: React.FC<HistoryStatsDrawerProps> = ({ isOpen, onClose, stats, dict }) => (
  <StreakStatsDrawer<HistoryMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    title={dict?.streaks?.historyStreak || 'History Streak'}
    accent="slate"
    stats={stats}
    dict={dict}
    renderLabel={(log) => (
      <div className="text-sm font-bold text-slate-900 dark:text-white">{log.killer_id}</div>
    )}
    renderMeta={(log) => (
      <span>Killers: {log.streak_before} &rarr; {log.streak_after} &middot; Row {log.row_index + 1}</span>
    )}
  />
);
