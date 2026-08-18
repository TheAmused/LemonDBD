import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
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

  const cleanDescription = (desc: string) => {
    if (!desc) return '';
    return desc.replace(/\*\*/g, '').trim();
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {t.teachablePerks || 'Teachable Perks'} ({perks.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.hoverToInspect || 'Hover over perk icons for preview, click for full details.'}
            </p>
          </div>
        </div>
      </div>

      {perks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-slate-900/20">
          <p className="text-xs text-slate-500 italic">
            {t.noPerks || 'No teachable perks cataloged for this character.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-4">
          {perks.map((perk, idx) => (
            <div
              key={`${perk.name}-${idx}`}
              className="relative group"
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
                className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/50 hover:border-amber-400 p-2.5 flex items-center justify-center shadow-xl hover:shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
                aria-label={perk.name}
              >
                <img
                  src={getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url)}
                  alt={perk.name}
                  className="h-full w-full object-contain filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-slate-950" />
              </button>

              {hoveredPerkIndex === idx && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-40 w-80 sm:w-96 p-4 rounded-2xl bg-slate-950/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
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
      )}
    </section>
  );
};
