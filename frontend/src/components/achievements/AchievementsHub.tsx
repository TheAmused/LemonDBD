'use client';
// frontend/src/components/achievements/AchievementsHub.tsx
import type { Dictionary } from '@/locales/types';

import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { TrophyShelf } from './TrophyShelf';
import { getTrophyShelves } from './shelves';

interface AchievementsHubProps {
  dict?: Dictionary;
}

/**
 * Static trophy-cabinet placeholder: 3 shelves (one per challenge mode with
 * difficulty tiers), each tier showing 2 locked silhouettes (owned-roster
 * clear vs full-roster clear). No completion data is wired up yet -- see
 * shelves.ts and TrophySlot.tsx for where that plugs in later.
 */
export const AchievementsHub: React.FC<AchievementsHubProps> = ({ dict }) => {
  const shelves = useMemo(() => getTrophyShelves(dict), [dict]);
  const t = dict?.achievements;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {t?.pageTitle || 'Achievements'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t?.subtitle || "Trophies for every challenge you've conquered."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {shelves.map((shelf) => (
          <TrophyShelf key={shelf.id} shelf={shelf} dict={dict} />
        ))}
      </div>
    </div>
  );
};
