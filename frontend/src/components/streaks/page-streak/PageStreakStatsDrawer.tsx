'use client';
// frontend/src/components/streaks/page-streak/PageStreakStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { PageStreakStats, PageStreakMatchLog } from '@/types/pageStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from "@/context/DictionaryContext";

export interface PageStreakStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PageStreakStats | null;
  /** The open killer's current attempt number. */
  attempts?: number;
}

export const PageStreakStatsDrawer: React.FC<PageStreakStatsDrawerProps> = ({ isOpen, onClose, stats, attempts }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<PageStreakMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    stats={stats}
    attempts={attempts}
    renderLabel={(log) => (
      <div className="text-base font-bold text-text-primary">{characterDisplayName(log.killer)}</div>
    )}
    renderGroupLabel={(log) => characterDisplayName(log.killer)}
    renderMeta={(log) => (
      <span>
        {dict.streaks.pageLabel} {log.page_number}
      </span>
    )}
  />
  );
};
