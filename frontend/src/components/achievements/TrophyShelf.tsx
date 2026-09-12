// frontend/src/components/achievements/TrophyShelf.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { TrophySlot } from './TrophySlot';
import type { TrophyShelfDef } from './shelves';

interface TrophyShelfProps {
  shelf: TrophyShelfDef;
  dict?: Dictionary;
}

export const TrophyShelf: React.FC<TrophyShelfProps> = ({ shelf, dict }) => {
  const t = dict?.achievements;
  const ownedBadge = t?.ownedBadgeLabel || 'Owned roster';
  const allBadge = t?.allBadgeLabel || 'Full roster';
  const beatPrefix = t?.beatChallengePrefix || 'Beat this challenge at';
  const difficultyWord = t?.difficultyWord || 'difficulty';
  const ownedSuffix = t?.ownedCharactersSuffix || 'using only your unlocked characters.';
  const allSuffix = t?.allCharactersSuffix || 'using every character in the game.';

  return (
    <div className="rounded-2xl border border-amber-800/30 bg-gradient-to-b from-amber-950/10 to-amber-900/5 dark:from-amber-950/20 dark:to-black/10 p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold tracking-wide text-slate-900 dark:text-slate-100">
        {shelf.title}
      </h2>

      <div className="flex flex-wrap gap-6">
        {shelf.tiers.map((tier) => {
          const hoverBase = `${beatPrefix} ${tier.label} ${difficultyWord}`.trim();
          return (
            <div key={tier.id} className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {tier.label}
              </span>
              <div className="flex gap-3">
                <TrophySlot variant="owned" badgeLabel={ownedBadge} hoverText={`${hoverBase} ${ownedSuffix}`} />
                <TrophySlot variant="all" badgeLabel={allBadge} hoverText={`${hoverBase} ${allSuffix}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Physical "shelf" ledge, purely decorative. */}
      <div className="mt-5 h-2 rounded-full bg-gradient-to-r from-transparent via-amber-800/40 to-transparent" />
    </div>
  );
};
