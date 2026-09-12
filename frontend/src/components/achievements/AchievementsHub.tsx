'use client';
// frontend/src/components/achievements/AchievementsHub.tsx
import type { Dictionary } from '@/locales/types';

import React, { useMemo } from 'react';
import { TrophyShelf } from './TrophyShelf';
import { getTrophyShelves } from './shelves';

interface AchievementsHubProps {
  dict?: Dictionary;
}

export const AchievementsHub: React.FC<AchievementsHubProps> = ({ dict }) => {
  const shelves = useMemo(() => getTrophyShelves(dict), [dict]);
  const t = dict?.achievements;

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
        {shelves.map((shelf) => (
          <TrophyShelf key={shelf.id} shelf={shelf} dict={dict} />
        ))}
      </div>

      <div className="lemon-shell-main fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
        <span className="pointer-events-auto rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-3 text-2xl font-black tracking-wide text-amber-500 shadow-lg">
          {t?.comingSoon || 'Coming Soon'}
        </span>
      </div>
    </div>
  );
};
