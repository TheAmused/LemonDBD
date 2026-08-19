'use client';
// frontend/src/components/character-detail/components/CharacterPerksSection.tsx

import React, { useState } from 'react';
import { CharacterItem, PerkItem, getAssetUrl, renderFormattedDbdText } from '../types';
import { Perk } from '@/types/perks';

interface CharacterPerksSectionProps {
  perks: PerkItem[];
  character: CharacterItem;
  backendBase: string;
  onSelectPerk: (perk: Perk) => void;
  t: Record<string, string>;
}

export const CharacterPerksSection: React.FC<CharacterPerksSectionProps> = ({
  perks,
  character,
  backendBase,
  onSelectPerk,
  t,
}) => {
  const [hoveredPerkIndex, setHoveredPerkIndex] = useState<number | null>(null);

  if (perks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 w-full">
      {perks.map((perk, idx) => {
        const iconSrc = getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url);

        return (
          <div
            key={`${perk.name}-${idx}`}
            className="relative"
            onMouseEnter={() => setHoveredPerkIndex(idx)}
            onMouseLeave={() => setHoveredPerkIndex(null)}
          >
            <button
              type="button"
              onClick={() =>
                onSelectPerk({
                  name: perk.name,
                  category: perk.category,
                  character: perk.character || character.name,
                  character_real_name: perk.character_real_name || character.real_name,
                  character_avatar_path: perk.character_avatar_path || character.avatar_local_path,
                  description: perk.description,
                  icon_url: perk.icon_url || '',
                  icon_local_path: perk.icon_local_path || '',
                })
              }
              className="h-24 w-24 sm:h-32 sm:w-32 flex items-center justify-center hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-2xl transition-all duration-300 cursor-pointer"
              aria-label={`${perk.name} - ${t.clickToInspect || 'Click to inspect perk'}`}
            >
              <img
                src={iconSrc}
                alt={perk.name}
                className="h-full w-full object-contain filter drop-shadow-[0_0_14px_rgba(245,158,11,0.6)]"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </button>

            {hoveredPerkIndex === idx && (
              <div
                role="tooltip"
                className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 w-72 sm:w-96 p-4 rounded-2xl bg-slate-950/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
                  <h4 className="text-sm font-black text-amber-400 truncate font-mono">
                    {perk.name}
                  </h4>
                  <span className="text-[10px] font-bold text-rose-400 shrink-0 uppercase tracking-wider">
                    {perk.category} Perk
                  </span>
                </div>
                <div className="space-y-1 text-xs max-h-56 overflow-y-auto pr-1">
                  {renderFormattedDbdText(perk.description, true)}
                </div>
                <span className="block text-[10px] font-mono text-amber-500 mt-2.5 text-right font-bold">
                  {t.clickToInspect || 'Click to inspect full perk values'} &rarr;
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
