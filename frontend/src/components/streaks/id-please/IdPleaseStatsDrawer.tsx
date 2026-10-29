'use client';
// frontend/src/components/streaks/id-please/IdPleaseStatsDrawer.tsx

import React from 'react';
import type { IdPleaseMatchLog, IdPleaseStats } from '@/types/idPleaseStreak';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { StreakStatsDrawer } from '../StreakStatsDrawer';

export interface IdPleaseStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: IdPleaseStats | null;
  attempts?: number;
}

export const IdPleaseStatsDrawer: React.FC<IdPleaseStatsDrawerProps> = ({ isOpen, onClose, stats, attempts }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  return (
    <StreakStatsDrawer<IdPleaseMatchLog>
      isOpen={isOpen}
      onClose={onClose}
      stats={stats}
      attempts={attempts}
      renderLabel={(log) => <div className="text-base font-bold text-text-primary">{characterDisplayName(log.character_name)}</div>}
      renderMeta={(log) => (
        <span>
          {formatMessage(dict.streaks.idPleaseMatchLabel, { number: log.match_number })} {dict.streaks.middotSeparator} {log.streak_after}
        </span>
      )}
    />
  );
};
