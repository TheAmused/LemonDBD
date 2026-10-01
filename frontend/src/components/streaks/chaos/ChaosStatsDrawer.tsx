'use client';
// frontend/src/components/streaks/chaos/ChaosStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { ChaosStats, ChaosMatchLog } from '@/types/chaosStreak';
import { StreakStatsDrawer, streakAtResult } from '../StreakStatsDrawer';
import { ADDON_RARITY_ICONS } from '@/constants/addonRarityIcons';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

export interface ChaosStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ChaosStats | null;
  attempts?: number;
  dict?: Dictionary;
}

export const ChaosStatsDrawer: React.FC<ChaosStatsDrawerProps> = ({ isOpen, onClose, stats, attempts, dict }) => {
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<ChaosMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    accent="amber"
    stats={stats}
    attempts={attempts}
    dict={dict}
    renderLabel={(log) => (
      <>
        <div className="text-sm font-bold text-text-primary">{characterDisplayName(log.killer_id)}</div>
        <div className="flex items-center gap-1 mt-1">
          {log.addon_rarities.map((rarity, i) => (
            <img
              key={i}
              src={ADDON_RARITY_ICONS[rarity]}
              alt={rarity}
                        className="h-3.5 w-3.5 rounded object-cover border border-border-color"
            />
          ))}
        </div>
      </>
    )}
    renderMeta={(log) => (
      <span>
        {dict?.streaks?.streakLabel || 'Streak:'} {streakAtResult(log)}
      </span>
    )}
  />
  );
};
