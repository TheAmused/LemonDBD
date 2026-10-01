'use client';
// frontend/src/components/streaks/page-streak/RunHeader.tsx

import React, { useState } from 'react';
import { Flame } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { PageStreakRun } from '@/types/pageStreak';
import { FreezeBadge } from '../FreezeBadge';
import { StreakStatTiles } from '../StreakStatTiles';
import { ChallengeHeaderLayout, StandardHeaderActions } from '../ChallengePanel';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { AdeptBadgeIcon, KillerIcon } from '@/components/icons/DbdIcons';

interface RunHeaderProps {
  run: PageStreakRun;
  avatarSrc?: string;
  onOpenReset: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  dict?: Dictionary;
}

export const RunHeader: React.FC<RunHeaderProps> = ({
  run,
  avatarSrc,
  onOpenReset,
  onOpenRules,
  onOpenStats,
  onOpenHistory,
  dict,
}) => {
  const killerDisplayName = useCharacterDisplayName()(run.killer);
  const [imgError, setImgError] = useState<boolean>(false);
  const cleared = run.status === 'completed' ? run.page_count : run.current_page - 1;

  return (
    <ChallengeHeaderLayout
      stats={
        <>
          <div className="flex items-center gap-2.5 rounded-xl border border-border-color bg-bg-elevated py-1.5 pl-1.5 pr-3.5 shadow-sm">
            <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg bg-bg-surface">
              {avatarSrc && !imgError ? (
                <img
                  src={avatarSrc}
                  alt={killerDisplayName}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <KillerIcon className="h-5 w-5 text-text-muted" aria-hidden="true" />
              )}
            </div>
            <span className="text-sm font-black tracking-wide text-text-primary">{killerDisplayName}</span>
          </div>
          <StreakStatTiles
            current={cleared}
            best={run.best_page}
            currentLabel={dict?.stats?.current || 'Current'}
            bestLabel={dict?.stats?.best || 'Best'}
            currentIcon={<Flame className="h-5 w-5" aria-hidden="true" />}
            bestIcon={<AdeptBadgeIcon className="h-5 w-5" aria-hidden="true" />}
          />
          <FreezeBadge frozen={run.pool_frozen} dict={dict} />
        </>
      }
      actions={
        <StandardHeaderActions
          onOpenRules={onOpenRules}
          onOpenStats={onOpenStats}
          onOpenHistory={onOpenHistory}
          onOpenReset={onOpenReset}
          dict={dict}
        />
      }
    />
  );
};
