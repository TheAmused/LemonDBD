import React, { useState } from 'react';
import { Search, Flame } from 'lucide-react';
import { AddonItem, EquipmentItem, getAssetUrl, getRarityTileStyle, renderFormattedDbdText } from '../types';

interface KillerEquipmentSectionProps {
  addons: (AddonItem | EquipmentItem)[];
  backendBase: string;
  onSelectEquipment: (item: AddonItem | EquipmentItem) => void;
  t: any;
}

export const KillerEquipmentSection: React.FC<KillerEquipmentSectionProps> = ({
  addons,
  backendBase,
  onSelectEquipment,
  t,
}) => {
  const [equipmentSearch, setEquipmentSearch] = useState<string>('');
  const [equipmentRarityFilter, setEquipmentRarityFilter] = useState<string>('all');
  const [hoveredEquipIndex, setHoveredEquipIndex] = useState<number | null>(null);

  const filteredEquipment = addons.filter((item) => {
    const query = equipmentSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query));

    const itemRarity = (item.rarity || '').toLowerCase();
    const matchesRarity =
      equipmentRarityFilter === 'all' || itemRarity.includes(equipmentRarityFilter.toLowerCase());

    return matchesSearch && matchesRarity;
  });

  const uniqueRarities = Array.from(
    new Set(addons.map((a) => a.rarity).filter(Boolean))
  ) as string[];

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
              {t.equipmentTitleKiller || 'Killer Power Add-ons'} ({addons.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.hoverToInspect || 'Hover over add-on icons for preview, click for full details.'}
            </p>
          </div>
        </div>

        {addons.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t.searchEquipment || 'Filter add-ons...'}
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {uniqueRarities.length > 0 && (
              <select
                value={equipmentRarityFilter}
                onChange={(e) => setEquipmentRarityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">{t.allRarities || 'All Rarities'}</option>
                {uniqueRarities.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {addons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-slate-900/20">
          <p className="text-xs text-slate-500 italic">
            {t.noEquipment || 'No specific add-ons cataloged for this killer in the database.'}
          </p>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-slate-900/20">
          <p className="text-xs text-slate-500">No add-ons match your filter.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-2 flex-wrap">
          {filteredEquipment.map((item, idx) => {
            const rarityStyle = getRarityTileStyle(item.rarity);
            return (
              <div
                key={`equip-${item.name}-${idx}`}
                className="relative group hover:z-10"
                onMouseEnter={() => setHoveredEquipIndex(idx)}
                onMouseLeave={() => setHoveredEquipIndex(null)}
              >
                <button
                  onClick={() => onSelectEquipment(item)}
                  className={`relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 p-1.5 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden ${rarityStyle.bg}`}
                  aria-label={item.name}
                >
                  <img
                    src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)}
                    alt={item.name}
                    className="h-full w-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </button>

                {hoveredEquipIndex === idx && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-[9999] w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-800">
                      <h4 className="text-xs font-black text-white truncate">{item.name}</h4>
                      {item.rarity && (
                        <span className={`text-[9px] font-bold uppercase ${rarityStyle.text}`}>{item.rarity}</span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                      {renderFormattedDbdText(item.description || '', true)}
                    </div>
                    <span className="block text-[9px] font-mono text-rose-400/80 mt-2 text-right font-bold">
                      {t.clickToInspect || 'Click to inspect full mechanics'} &rarr;
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
