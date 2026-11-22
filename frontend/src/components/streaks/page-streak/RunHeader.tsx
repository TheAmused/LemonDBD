'use client';
// frontend/src/components/streaks/page-streak/RunHeader.tsx


import React from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import type { PageStreakRun } from '@/types/pageStreak';
import { FreezeBadge } from '../FreezeBadge';
import { StreakStatTiles } from '../StreakStatTiles';
import { ChallengeHeaderLayout, StandardHeaderActions } from '../ChallengePanel';


import { useDictionary } from "@/context/DictionaryContext";
import { ChevronIcon, TrophyIcon } from '@/components/icons/DbdIcons';
import { buttonClassName } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';

interface RunHeaderProps {
  run: PageStreakRun;
  /** The killer picker this run came from. */
  backHref: string;
  onOpenAbandon: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
}

export const RunHeader: React.FC<RunHeaderProps> = ({ run, backHref, onOpenAbandon, onOpenRules, onOpenStats, onOpenHistory }) => {
  const dict = useDictionary();
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;

  return (
    <ChallengeHeaderLayout
      leading={
        <Link
          href={backHref}
          aria-label={dict.streaks.back}
          {...tip(dict.streaks.back, undefined, 'action')}
          className={buttonClassName('ghost', 'sm', 'h-11 w-11 px-0')}
        >
          <ChevronIcon className="icon-lg rotate-180" aria-hidden="true" />
        </Link>
      }
      stats={
        <>
          <StreakStatTiles
            current={cleared}
            best={run.best_page}
            currentLabel={dict.streaks.current}
            bestLabel={dict.streaks.best}
            currentIcon={<Flame className="icon-lg" aria-hidden="true" />}
            bestIcon={<TrophyIcon className="icon-lg" aria-hidden="true" />}
          />
          <FreezeBadge frozen={run.pool_frozen} />
        </>
      }
      actions={
        <StandardHeaderActions
          onOpenRules={onOpenRules}
          onOpenStats={onOpenStats}
          onOpenHistory={onOpenHistory}
          onOpenAbandon={onOpenAbandon}
        />
      }
    />
  );
};
