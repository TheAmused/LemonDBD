// frontend/src/components/character-detail/components/OfferingsSection.tsx
import React, { useState, useMemo } from 'react';
import { Sparkles, Search, Gift, ShieldAlert, Award } from 'lucide-react';
import {
  OfferingItem,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank,
  renderFormattedDbdText,
} from '../types';

interface OfferingsSectionProps {
  offerings?: OfferingItem[];
  role: 'Killer' | 'Survivor';
  backendBase: string;
  onSelectOffering?: (item: OfferingItem) => void;
  t: Record<string, string>;
}

export const OfferingsSection: React.FC<OfferingsSectionProps> = ({
  offerings = [],
  role,
  backendBase,
  onSelectOffering,
  t,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [activeHover, setActiveHover] = useState<{
    item: OfferingItem;
    rect: DOMRect;
  } | null>(null);

  const isKiller = role === 'Killer';

  // Category definitions
  const categories = useMemo(() => {
    if (isKiller) {
      return [
        { key: 'all', label: t.allOfferings || 'All Offerings' },
        { key: 'mori', label: t.categoryMori || 'Memento Moris' },
        { key: 'bloodpoint', label: t.categoryBloodpoints || 'Bloodpoints' },
        { key: 'map', label: t.categoryMap || 'Realm Realms' },
        { key: 'shroud', label: t.categoryShroud || 'Shrouds' },
        { key: 'ward', label: t.categoryWard || 'Wards' },
      ];
    }
    return [
      { key: 'all', label: t.allOfferings || 'All Offerings' },
      { key: 'bloodpoint', label: t.categoryBloodpoints || 'Bloodpoints' },
      { key: 'luck', label: t.categoryLuck || 'Luck Charms' },
      { key: 'map', label: t.categoryMap || 'Realm Realms' },
      { key: 'shroud', label: t.categoryShroud || 'Shrouds' },
      { key: 'blueprint', label: t.categoryBlueprint || 'Blueprints' },
      { key: 'chest', label: t.categoryChest || 'Chests & Fog' },
    ];
  }, [isKiller, t]);

  const sortedAndFilteredOfferings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return offerings
      .filter((off) => {
        const matchesSearch =
          !query ||
          off.name.toLowerCase().includes(query) ||
          Boolean(off.description && off.description.toLowerCase().includes(query));

        const offRarity = (off.rarity || '').toLowerCase();
        const matchesRarity =
          rarityFilter === 'all' || offRarity.includes(rarityFilter.toLowerCase());

        let matchesCat = true;
        const nameLower = off.name.toLowerCase();
        const descLower = (off.description || '').toLowerCase();
        const catLower = (off.category || '').toLowerCase();

        if (selectedCategory === 'mori') {
          matchesCat = nameLower.includes('mori') || catLower.includes('mori');
        } else if (selectedCategory === 'bloodpoint') {
          matchesCat =
            nameLower.includes('streamers') ||
            nameLower.includes('cake') ||
            nameLower.includes('pudding') ||
            nameLower.includes('envelope') ||
            nameLower.includes('wreath') ||
            nameLower.includes('flan') ||
            nameLower.includes('cobbler') ||
            descLower.includes('bloodpoint');
        } else if (selectedCategory === 'map') {
          matchesCat =
            catLower.includes('realm') ||
            catLower.includes('map') ||
            nameLower.includes('plate') ||
            nameLower.includes('license') ||
            nameLower.includes('badge') ||
            nameLower.includes('whistle') ||
            nameLower.includes('glass') ||
            nameLower.includes('eye') ||
            nameLower.includes('stew') ||
            nameLower.includes('drawing') ||
            nameLower.includes('crow') ||
            descLower.includes('increases the chance of being sent to');
        } else if (selectedCategory === 'shroud') {
          matchesCat = nameLower.includes('shroud');
        } else if (selectedCategory === 'ward') {
          matchesCat = nameLower.includes('ward');
        } else if (selectedCategory === 'luck') {
          matchesCat = nameLower.includes('chalk') || nameLower.includes('jar') || nameLower.includes('lip');
        } else if (selectedCategory === 'blueprint') {
          matchesCat = nameLower.includes('blueprint');
        } else if (selectedCategory === 'chest') {
          matchesCat = nameLower.includes('coin') || nameLower.includes('reagent') || nameLower.includes('vial');
        }

        return matchesSearch && matchesRarity && matchesCat;
      })
      .sort((a, b) => {
        const rankA = getRarityRank(a.rarity);
        const rankB = getRarityRank(b.rarity);
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [offerings, searchQuery, rarityFilter, selectedCategory]);

  if (!offerings || offerings.length === 0) return null;

  return (
    <section className="p-5 sm:p-6 rounded-3xl bg-slate-950/40 border border-slate-800/80 shadow-xl space-y-5 relative w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${
              isKiller
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 font-mono tracking-tight flex items-center gap-2">
              {t.offeringsTitle || 'Offerings & Sacrificial Rites'}
              <span
                className={`text-sm font-bold font-mono ${
                  isKiller ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                ({sortedAndFilteredOfferings.length})
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {isKiller
                ? t.offeringsDescKiller ||
                  'Explore Memento Moris, wards, dark shrouds, and hooks burned to empower the Entity.'
                : t.offeringsDescSurvivor ||
                  'Explore realm reagents, luck charms, shrouds, and blueprints burned before a Trial.'}
            </p>
          </div>
        </div>

        {/* Filter / Search bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder={t.searchOfferings || 'Filter offerings...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
            />
          </div>

          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
          >
            <option value="all">{t.allRarities || 'All Rarities'}</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very rare">Very Rare</option>
            <option value="ultra rare">Ultra Rare</option>
            <option value="event">Event</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                isActive
                  ? isKiller
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Offerings Grid */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-2">
        {sortedAndFilteredOfferings.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-mono">
            {t.noMatchingOfferings || 'No offerings match the active filters.'}
          </div>
        ) : (
          sortedAndFilteredOfferings.map((offering, idx) => {
            const id = `offering-${offering.name}-${idx}`;
            const rarityStyle = getRarityTileStyle(offering.rarity);

            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectOffering?.(offering)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectOffering?.(offering);
                  }
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveHover({ item: offering, rect });
                }}
                onMouseLeave={() => setActiveHover(null)}
                className={`relative group rounded-3xl border-2 p-2 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 shadow-lg ${rarityStyle.bg}`}
                aria-label={`Inspect offering: ${offering.name}`}
              >
                <img
                  src={getAssetUrl(backendBase, offering.icon_local_path, offering.icon_url)}
                  alt={offering.name}
                  className="h-full w-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Hover Tooltip */}
      {activeHover && typeof window !== 'undefined' && (() => {
        const tooltipWidth = 320;
        const left = Math.max(
          16,
          Math.min(
            window.innerWidth - tooltipWidth - 16,
            activeHover.rect.left + activeHover.rect.width / 2 - tooltipWidth / 2
          )
        );
        const top = activeHover.rect.bottom + 10;
        const rarityStyle = getRarityTileStyle(activeHover.item.rarity);

        return (
          <div
            style={{
              position: 'fixed',
              top: `${Math.min(top, window.innerHeight - 200)}px`,
              left: `${left}px`,
              width: `${tooltipWidth}px`,
              zIndex: 9999,
            }}
            className="p-3.5 rounded-2xl bg-slate-950/95 border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 space-y-2"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <span className="font-bold text-sm text-slate-100 font-mono leading-tight">
                {activeHover.item.name}
              </span>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${rarityStyle.badge}`}
              >
                {activeHover.item.rarity || 'Common'}
              </span>
            </div>

            {activeHover.item.description && (
              <div className="text-xs text-slate-300 leading-relaxed font-sans max-h-48 overflow-y-auto">
                {renderFormattedDbdText(activeHover.item.description)}
              </div>
            )}

            <div className="pt-1 border-t border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>{activeHover.item.category || 'Offering'}</span>
              <span className="text-amber-400 font-bold">{t.clickToInspect || 'Click to view'}</span>
            </div>
          </div>
        );
      })()}
    </section>
  );
};
