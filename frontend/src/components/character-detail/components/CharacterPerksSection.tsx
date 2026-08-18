import React, { useState } from 'react';
import { CharacterItem, PerkItem, getAssetUrl, renderFormattedDbdText } from '../types';
import { Perk as PerkModalType } from '@/components/PerkCard';

interface CharacterPerksSectionProps {
  perks: PerkItem[];
  character: CharacterItem;
  backendBase: string;
  onSelectPerk: (perk: PerkModalType) => void;
  t: any;
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
    <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 pt-4">
      {perks.map((perk, idx) => (
        <div
          key={`${perk.name}-${idx}`}
          className="relative"
          onMouseEnter={() => setHoveredPerkIndex(idx)}
          onMouseLeave={() => setHoveredPerkIndex(null)}
        >
          <button
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
            className="h-28 w-28 sm:h-36 sm:w-36 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
            aria-label={perk.name}
          >
            <img
              src={getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url)}
              alt={perk.name}
              className="h-full w-full object-contain filter drop-shadow-[0_0_14px_rgba(245,158,11,0.6)]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </button>

          {hoveredPerkIndex === idx && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 w-80 sm:w-96 p-4 rounded-2xl bg-slate-950/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
                <h4 className="text-sm font-black text-amber-400 truncate font-mono">{perk.name}</h4>
                <span className="text-[10px] font-bold text-rose-400 shrink-0 uppercase tracking-wider">
                  {perk.category} Perk
                </span>
              </div>
              <div className="space-y-1 text-xs max-h-56 overflow-y-auto">
                {renderFormattedDbdText(perk.description, true)}
              </div>
              <span className="block text-[10px] font-mono text-amber-500/80 mt-2.5 text-right font-bold">
                {t.clickToInspect || 'Click to inspect full perk values'} &rarr;
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
