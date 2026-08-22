// frontend/src/components/streaks/page-streak/PageStreakStatsDrawer.tsx
'use client';

import React from 'react';
import { PageStreakStats, PageStreakMatchLog } from '@/types/pageStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';

export interface PageStreakStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PageStreakStats | null;
}

export const PageStreakStatsDrawer: React.FC<PageStreakStatsDrawerProps> = ({ isOpen, onClose, stats }) => (
  <StreakStatsDrawer<PageStreakMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    title="Page Streak"
    accent="orange"
    stats={stats}
    renderLabel={(log) => (
      <div className="text-sm font-bold text-slate-900 dark:text-white">{log.killer}</div>
    )}
    renderMeta={(log) => <span>Attempt {log.attempt} &middot; Page {log.page_number}</span>}
  />
);
