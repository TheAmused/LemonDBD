'use client';
// frontend/src/components/streaks/page-streak/PageStreakStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { PageStreakStats, PageStreakMatchLog } from '@/types/pageStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

export interface PageStreakStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PageStreakStats | null;
  /** The open killer's current attempt number. */
  attempts?: number;
  dict?: Dictionary;
}

export const PageStreakStatsDrawer: React.FC<PageStreakStatsDrawerProps> = ({ isOpen, onClose, stats, attempts, dict }) => {
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<PageStreakMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    stats={stats}
    attempts={attempts}
    dict={dict}
    renderLabel={(log) => (
      <div className="text-base font-bold text-text-primary">{characterDisplayName(log.killer)}</div>
    )}
    renderMeta={(log) => (
      <span>
        {dict?.streaks?.attemptLabel || 'Attempt'} {log.attempt} {dict?.streaks?.middotSeparator || '·'} {dict?.streaks?.pageLabel || 'Page'} {log.page_number}
      </span>
    )}
  />
  );
};
