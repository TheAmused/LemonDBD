// frontend/src/components/character-detail/components/OfferingsSection.tsx
import React, { useState, useMemo } from 'react';
import {
  Search,
  Gift,
  Skull,
  Coins,
  Map as MapIcon,
  EyeOff,
  Shield,
  Sparkles,
  Layers,
  Box,
} from 'lucide-react';
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
  const isKiller = role === 'Killer';

  const categories = useMemo(() => {
    if (isKiller) {
      return [
        { key: 'special', label: t.categorySpecial || 'Special & Events', icon: Sparkles, desc: 'Anniversary & celebration offerings' },
        { key: 'mori', label: t.categoryMori || 'Memento Mori', icon: Skull, desc: 'Execution rites' },
        { key: 'bloodpoint', label: t.categoryBloodpoints || 'Bloodpoints', icon: Coins, desc: 'Score multipliers' },
        { key: 'map', label: t.categoryMap || 'Realm Offerings', icon: MapIcon, desc: 'Location selections' },
        { key: 'shroud', label: t.categoryShroud || 'Shrouds', icon: EyeOff, desc: 'Spawn positions' },
        { key: 'ward', label: t.categoryWard || 'Wards', icon: Shield, desc: 'Protection against loss' },
      ];
    }
    return [
      { key: 'special', label: t.categorySpecial || 'Special & Events', icon: Sparkles, desc: 'Anniversary & celebration offerings' },
      { key: 'bloodpoint', label: t.categoryBloodpoints || 'Bloodpoints', icon: Coins, desc: 'Score multipliers' },
      { key: 'luck', label: t.categoryLuck || 'Luck Charms', icon: Sparkles, desc: 'Trial fortune' },
      { key: 'map', label: t.categoryMap || 'Realm Offerings', icon: MapIcon, desc: 'Location selections' },
      { key: 'shroud', label: t.categoryShroud || 'Shrouds', icon: EyeOff, desc: 'Spawn positions' },
      { key: 'blueprint', label: t.categoryBlueprint || 'Blueprints', icon: Layers, desc: 'Hatch & basement placement' },
      { key: 'chest', label: t.categoryChest || 'Chests & Fog', icon: Box, desc: 'Chest spawns & fog density' },
      { key: 'ward', label: t.categoryWard || 'Wards', icon: Shield, desc: 'Item & offering preservation' },
    ];
  }, [isKiller, t]);

  const [selectedCategory, setSelectedCategory] = useState<string>(
    isKiller ? 'mori' : 'bloodpoint'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'rarity_desc' | 'rarity_asc' | 'name_asc'>('rarity_asc');
  const [activeHover, setActiveHover] = useState<{
    item: OfferingItem;
    rect: DOMRect;
  } | null>(null);

  const activeCategoryConfig =
    categories.find((c) => c.key === selectedCategory) || categories[0];

  const sortedAndFilteredOfferings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return offerings
      .filter((off) => {
        const matchesSearch =
          !query ||
          off.name.toLowerCase().includes(query) ||
          Boolean(off.raw_name && off.raw_name.toLowerCase().includes(query)) ||
          Boolean(off.description && off.description.toLowerCase().includes(query));

        const offRarity = (off.rarity || '').toLowerCase();
        const matchesRarity =
          rarityFilter === 'all' || offRarity.includes(rarityFilter.toLowerCase());

        let matchesCat = false;
        const nameLower = off.name.toLowerCase();
        const rawLower = (off.raw_name || '').toLowerCase();
        const descLower = (off.description || '').toLowerCase();
        const catLower = (off.category || '').toLowerCase();
        const text = `${nameLower} ${rawLower} ${descLower} ${catLower}`;

        const isEventOffering =
          offRarity === 'event' ||
          catLower === 'special' ||
          text.includes('dousing') ||
          text.includes('dowsing') ||
          text.includes('flan') ||
          text.includes('cobbler') ||
          text.includes('terrormisu') ||
          text.includes('torte') ||
          text.includes('scream pie') ||
          text.includes('gateau') ||
          text.includes('sacrificial cake') ||
          text.includes('pustula') ||
          text.includes('cursed seed') ||
          text.includes('bbq invitation') ||
          text.includes('red envelope') ||
          text.includes('bloodshot eye');

        if (selectedCategory === 'special') {
          matchesCat = isEventOffering;
        } else if (selectedCategory === 'mori') {
          matchesCat = text.includes('mori') || text.includes('cypress') || text.includes('ivory') || text.includes('ebony');
        } else if (selectedCategory === 'bloodpoint') {
          matchesCat =
            !isEventOffering &&
            (text.includes('streamers') ||
              text.includes('cake') ||
              text.includes('pudding') ||
              text.includes('envelope') ||
              text.includes('wreath') ||
              text.includes('sachet') ||
              text.includes('blossom') ||
              text.includes('laurel') ||
              text.includes('amaranth') ||
              text.includes('hollow shell') ||
              text.includes('bloodpoint') ||
              text.includes('punkty krwi') ||
              text.includes('blutpunkte'));
        } else if (selectedCategory === 'map') {
          matchesCat =
            text.includes('realm') ||
            text.includes('chance of being sent to') ||
            text.includes('plate') ||
            text.includes('license') ||
            text.includes('badge') ||
            text.includes('whistle') ||
            text.includes('glass') ||
            text.includes('eye') ||
            text.includes('stew') ||
            text.includes('drawing') ||
            text.includes('crow') ||
            text.includes('charred') ||
            text.includes('beef') ||
            text.includes('heart') ||
            text.includes('branch') ||
            text.includes('photograph') ||
            text.includes('gramophone') ||
            text.includes('królestwo');
        } else if (selectedCategory === 'shroud') {
          matchesCat = text.includes('shroud') || text.includes('całun');
        } else if (selectedCategory === 'ward') {
          matchesCat = text.includes('ward') || text.includes('protection') || text.includes('ochron');
        } else if (selectedCategory === 'luck') {
          matchesCat = text.includes('chalk') || text.includes('jar') || text.includes('lip') || text.includes('luck') || text.includes('szczęśc');
        } else if (selectedCategory === 'blueprint') {
          matchesCat = text.includes('blueprint') || text.includes('hatch') || text.includes('basement') || text.includes('plan');
        } else if (selectedCategory === 'chest') {
          matchesCat = text.includes('coin') || text.includes('reagent') || text.includes('vial') || text.includes('fog') || text.includes('chest') || text.includes('mgł') || text.includes('skrzyn');
        }

        return matchesSearch && matchesRarity && matchesCat;
      })
      .sort((a, b) => {
        if (sortOrder === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        const rankA = getRarityRank(a.rarity);
        const rankB = getRarityRank(b.rarity);
        if (sortOrder === 'rarity_asc') {
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name);
        }
        if (rankA !== rankB) return rankB - rankA;
        return a.name.localeCompare(b.name);
      });
  }, [offerings, searchQuery, rarityFilter, selectedCategory, sortOrder]);

  if (!offerings || offerings.length === 0) return null;

  return (
    <section className="space-y-6 w-full pt-2">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
              isKiller
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Gift className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 font-mono tracking-tight">
              {t.offeringsTitle || 'Offerings & Sacrificial Rites'}
            </h2>
            <p className="text-xs text-slate-400">
              {isKiller
                ? t.offeringsDescKiller || 'Burn offerings to the Entity to alter Realm conditions, score gains, and execution rules.'
                : t.offeringsDescSurvivor || 'Burn offerings before a Trial to modify luck, chests, maps, and protection.'}
            </p>
          </div>
        </div>

        {/* Filter / Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-44">
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
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer shadow-inner [&>option]:bg-slate-900 [&>option]:text-slate-100"
          >
            <option value="all">{t.allRarities || 'All Rarities'}</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
            <option value="Very Rare">Very Rare</option>
            <option value="Ultra Rare">Ultra Rare</option>
            <option value="Event">Event</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'rarity_desc' | 'rarity_asc' | 'name_asc')}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer shadow-inner [&>option]:bg-slate-900 [&>option]:text-slate-100"
            aria-label="Order offerings"
          >
            <option value="rarity_asc">Rarity: Low &rarr; High</option>
            <option value="rarity_desc">Rarity: High &rarr; Low</option>
            <option value="name_asc">Name: A &rarr; Z</option>
          </select>
        </div>
      </div>

      {/* Main Container with Centered Category Buttons Straddling the Top Border */}
      <div className="relative mt-8 pt-8 pb-5 px-5 sm:px-6 rounded-3xl bg-slate-950/40 border border-slate-800 shadow-lg w-full">
        {/* Buttons Centered on the Top Border */}
        <div className="absolute -top-5 inset-x-0 flex justify-center z-10 px-2 pointer-events-none">
          <div
            role="tablist"
            aria-label="Offering categories"
            className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl backdrop-blur-md pointer-events-auto max-w-full"
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  type="button"
                  key={cat.key}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer text-xs font-bold ${
                    isSelected
                      ? isKiller
                        ? 'bg-rose-500/20 border border-rose-500/60 text-rose-300 shadow-md shadow-rose-950/50 scale-105'
                        : 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/50 scale-105'
                      : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                  title={`${cat.label} - ${cat.desc}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{cat.label}</span>
                  {isSelected && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isKiller ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Subtitle */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-4">
          <h3
            className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isKiller ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            <Gift className="h-4 w-4" />
            {activeCategoryConfig.label} &bull; Offerings ({sortedAndFilteredOfferings.length})
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Click offering for details</span>
        </div>

        {/* Offerings Grid */}
        {sortedAndFilteredOfferings.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-center text-slate-500 text-xs italic">
            No offerings found in this category matching your active filter.
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3.5 p-2">
            {sortedAndFilteredOfferings.map((offering, idx) => {
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
                  className={`relative group rounded-2xl border-2 p-2 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 h-20 w-20 sm:h-24 sm:w-24 ${rarityStyle.bg}`}
                  aria-label={`Inspect offering: ${offering.name}`}
                >
                  <img
                    src={getAssetUrl(backendBase, offering.icon_local_path, offering.icon_url)}
                    alt={offering.name}
                    className="h-full w-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              );
            })}
          </div>
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

