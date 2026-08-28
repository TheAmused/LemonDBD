import type { Dictionary } from '@/locales/types';
// frontend/src/components/streaks/gauntlet/GauntletStatsDrawer.tsx
'use client';

import React from 'react';
import { GauntletStats, MatchLog } from '@/types/gauntletStreak';
import { Flame } from 'lucide-react';
import { StreakStatsDrawer } from '../StreakStatsDrawer';

export interface GauntletStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GauntletStats | null;
  dict?: Dictionary;
}

export const GauntletStatsDrawer: React.FC<GauntletStatsDrawerProps> = ({ isOpen, onClose, stats, dict }) => (
  <StreakStatsDrawer<MatchLog>
    isOpen={isOpen}
    onClose={onClose}
    title={dict?.streaks?.gauntlet || 'Gauntlet'}
    accent="amber"
    stats={stats}
    renderLabel={(log: MatchLog) => (
      <div className="text-sm font-bold text-slate-900 dark:text-white">{log.character_id}</div>
    )}
    renderMeta={(log: MatchLog) => (
      <span className="inline-flex items-center gap-1">
        <Flame className="w-3 h-3 text-amber-500" />
        {dict?.streaks?.streakLabel || 'Streak:'} {log.streak_before} {dict?.streaks?.streakArrow || '→'}{' '}
        {log.streak_after}
      </span>
    )}
  />
);