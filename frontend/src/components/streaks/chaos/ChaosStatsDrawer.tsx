'use client';
// frontend/src/components/streaks/chaos/ChaosStatsDrawer.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { ChaosStats, ChaosMatchLog } from '@/types/chaosStreak';
import { StreakStatsDrawer, streakAtResult } from '../StreakStatsDrawer';
import { ADDON_RARITY_ICONS } from '@/constants/addonRarityIcons';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

import { tip } from '@/components/common/Tooltip';
import { useDictionary } from "@/context/DictionaryContext";

export interface ChaosStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ChaosStats | null;
  attempts?: number;
}

export const ChaosStatsDrawer: React.FC<ChaosStatsDrawerProps> = ({ isOpen, onClose, stats, attempts }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  return (
  <StreakStatsDrawer<ChaosMatchLog>
    isOpen={isOpen}
    onClose={onClose}
    stats={stats}
    attempts={attempts}
    renderLabel={(log) => (
      <div className="text-base font-bold text-text-primary">{characterDisplayName(log.killer_id)}</div>
    )}
    renderMeta={(log) => (
      <span className="inline-flex items-center gap-1.5">
        {dict.streaks.streakLabel} {streakAtResult(log)}
        <span>{dict.streaks.middotSeparator}</span>
        {log.addon_rarities.map((rarity, i) => (
          <img
            key={i}
            src={ADDON_RARITY_ICONS[rarity]}
            alt={rarity}
            {...tip(rarity, undefined, 'item')}
            className="h-3.5 w-3.5 rounded object-cover border border-border-color"
          />
        ))}
      </span>
    )}
  />
  );
};
