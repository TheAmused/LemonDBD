// frontend/src/components/streaks/chaos/ChaosStatsDrawer.tsx
'use client';

import React from 'react';
import { ChaosStats, ChaosMatchLog } from '@/types/chaosStreak';
import { StreakStatsDrawer } from '../StreakStatsDrawer';
import { ADDON_RARITY_ICONS } from '@/constants/addonRarityIcons';

export interface ChaosStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ChaosStats | null;
  dict?: any;
}

export const ChaosStatsDrawer: React.FC<ChaosStatsDrawerProps> = ({ isOpen, onClose, stats, dict }) => (
  <StreakStatsDrawer<ChaosMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    title={dict?.streaks?.chaosStreak || 'Chaos Streak'}
    accent="violet"
    stats={stats}
    dict={dict}
    renderLabel={(log) => (
      <>
        <div className="text-sm font-bold text-slate-900 dark:text-white">{log.killer_id}</div>
        <div className="flex items-center gap-1 mt-1">
          {log.addon_rarities.map((rarity, i) => (
            <img
              key={i}
              src={ADDON_RARITY_ICONS[rarity]}
              alt={rarity}
              title={rarity}
              className="h-3.5 w-3.5 rounded object-cover border border-black/10 dark:border-white/10"
            />
          ))}
        </div>
      </>
    )}
    renderMeta={(log) => (
      <span>
        {dict?.streaks?.streakLabel || 'Streak:'} {log.streak_before} {dict?.streaks?.streakArrow || '→'}{' '}
        {log.streak_after}
      </span>
    )}
  />
);
