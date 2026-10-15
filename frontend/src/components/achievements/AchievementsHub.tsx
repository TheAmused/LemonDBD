'use client';
// frontend/src/components/achievements/AchievementsHub.tsx

import React, { useMemo } from 'react';
import { TrophyShelf } from './TrophyShelf';
import { getTrophyShelves } from './shelves';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';

interface AchievementsHubProps {
}

export const AchievementsHub: React.FC<AchievementsHubProps> = () => {
  const dict = useDictionary();
  const shelves = useMemo(() => getTrophyShelves(dict), [dict]);
  const t = dict.achievements;

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="space-y-6 blur-sm select-none pointer-events-none" aria-hidden="true">
        {shelves.map((shelf) => (
          <TrophyShelf key={shelf.id} shelf={shelf} />
        ))}
      </div>

      <div className="fixed left-[var(--sidebar-width,0rem)] inset-y-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-[left] duration-300">
        <Badge tone="amber" size="lg" plain square className="pointer-events-auto shadow-lg">
          {t.comingSoon}
        </Badge>
      </div>
    </div>
  );
};
