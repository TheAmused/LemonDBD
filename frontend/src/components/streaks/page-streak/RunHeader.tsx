'use client';
// frontend/src/components/streaks/page-streak/RunHeader.tsx

import { Button } from '@/components/common/Button';
import React from 'react';
import { Flame } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { PageStreakRun } from '@/types/pageStreak';
import { FreezeBadge } from '../FreezeBadge';
import { StreakStatTiles } from '../StreakStatTiles';
import { ChallengeHeaderLayout, StandardHeaderActions } from '../ChallengePanel';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { useDictionary } from "@/context/DictionaryContext";

interface RunHeaderProps {
  run: PageStreakRun;
  onOpenReset: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
}

export const RunHeader: React.FC<RunHeaderProps> = ({ run, onOpenReset, onOpenRules, onOpenStats, onOpenHistory }) => {
  const dict = useDictionary();
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;

  return (
    <ChallengeHeaderLayout
      stats={
        <>
          <StreakStatTiles
            current={cleared}
            best={run.best_page}
            currentLabel={dict.stats.current}
            bestLabel={dict.stats.best}
            currentIcon={<Flame className="h-5 w-5" aria-hidden="true" />}
            bestIcon={<AdeptBadgeIcon className="h-5 w-5" aria-hidden="true" />}
          />
          <FreezeBadge frozen={run.pool_frozen} />
        </>
      }
      actions={
        <StandardHeaderActions
          onOpenRules={onOpenRules}
          onOpenStats={onOpenStats}
          onOpenHistory={onOpenHistory}
          onOpenReset={onOpenReset}
        />
      }
    />
  );
};
