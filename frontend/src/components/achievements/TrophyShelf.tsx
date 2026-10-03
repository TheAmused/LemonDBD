// frontend/src/components/achievements/TrophyShelf.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { TrophySlot } from './TrophySlot';
import type { TrophyShelfDef } from './shelves';
import { useDictionary } from "@/context/DictionaryContext";

interface TrophyShelfProps {
  shelf: TrophyShelfDef;
}

export const TrophyShelf: React.FC<TrophyShelfProps> = ({ shelf }) => {
  const dict = useDictionary();
  const t = dict.achievements;
  const ownedBadge = t.ownedBadgeLabel;
  const allBadge = t.allBadgeLabel;
  const beatPrefix = t.beatChallengePrefix;
  const difficultyWord = t.difficultyWord;
  const ownedSuffix = t.ownedCharactersSuffix;
  const allSuffix = t.allCharactersSuffix;

  return (
    <div className="rounded-2xl border border-accent-amber/30 bg-gradient-to-b from-accent-amber/10 to-accent-amber/5 p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold tracking-wide text-text-primary">
        {shelf.title}
      </h2>

      <div className="flex flex-wrap gap-6">
        {shelf.tiers.map((tier) => {
          const hoverBase = `${beatPrefix} ${tier.label} ${difficultyWord}`.trim();
          const ownedHover = tier.hoverText?.owned ?? `${hoverBase} ${ownedSuffix}`;
          const allHover = tier.hoverText?.all ?? `${hoverBase} ${allSuffix}`;
          return (
            <div key={tier.id} className="flex flex-col items-center gap-2">
              <span className="type-label-sm text-text-muted">
                {tier.label}
              </span>
              <div className="flex gap-3">
                <TrophySlot variant="owned" badgeLabel={ownedBadge} hoverText={ownedHover} />
                <TrophySlot variant="all" badgeLabel={allBadge} hoverText={allHover} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 h-2 rounded-full bg-gradient-to-r from-transparent via-accent-amber/40 to-transparent" />
    </div>
  );
};
