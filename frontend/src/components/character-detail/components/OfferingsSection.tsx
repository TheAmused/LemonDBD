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
} from '../types';
import { UnifiedHoverModal, ActiveHoverState } from './UnifiedHoverModal';

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
  const [activeHover, setActiveHover] = useState<ActiveHoverState | null>(null);

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

        const raw = (off.raw_name || off.name || '').trim();
        const rawLower = raw.toLowerCase();
        const nameLower = (off.name || '').toLowerCase();
        const catLower = (off.category || '').toLowerCase();
        const rarityLower = (off.rarity || '').toLowerCase();

        let itemCategory = 'map';

        // 1. Memento Mori (EXACT name check)
        if (
          rawLower.includes('memento mori') ||
          nameLower.includes('memento mori') ||
          raw === 'Cypress Memento Mori' ||
          raw === 'Ivory Memento Mori' ||
          raw === 'Ebony Memento Mori'
        ) {
          itemCategory = 'mori';
        }
        // 2. Special / Event Offerings (Anniversary cakes, event foods, seasonal envelopes)
        else if (
          rarityLower === 'event' ||
          catLower === 'special' ||
          [
            'gateau', 'flan', 'cobbler', 'terrormisu', 'sacrificial cake', 'torte', 'scream pie',
            'pustula', 'cursed seed', 'bbq invitation', 'red envelope', 'bloodshot eye', 'dowsing', 'dousing'
          ].some((k) => rawLower.includes(k) || nameLower.includes(k))
        ) {
          itemCategory = 'special';
        }
        // 3. Wards (Preservation / Protection)
        else if (
          raw === 'Black Ward' ||
          raw === 'White Ward' ||
          raw === 'Sacrificial Ward' ||
          (rawLower.endsWith('ward') && !rawLower.endsWith('reward')) ||
          (nameLower.endsWith('ward') && !nameLower.endsWith('reward')) ||
          nameLower.includes('ochron')
        ) {
          itemCategory = 'ward';
        }
        // 4. Shrouds (Spawn modifiers)
        else if (rawLower.includes('shroud') || nameLower.includes('całun') || nameLower.includes('schleier')) {
          itemCategory = 'shroud';
        }
        // 5. Blueprints (Hatch & Basement placements)
        else if (rawLower.includes('blueprint') || nameLower.includes('plan') || nameLower.includes('blaupause')) {
          itemCategory = 'blueprint';
        }
        // 6. Luck Charms (Chalk pouches, salt pouches, statuettes, salty lips)
        else if (
          ['chalk', 'salt', 'salty lips', 'statuette'].some((k) => rawLower.includes(k)) ||
          nameLower.includes('kreda') ||
          nameLower.includes('sól') ||
          nameLower.includes('szczęśc')
        ) {
          itemCategory = 'luck';
        }
        // 7. Bloodpoints (Wreaths, blossoms, sachets, cakes, puddings, envelopes, streamers)
        else if (
          ['streamers', 'escape! cake', 'pudding', 'envelope', 'wreath', 'blossom',
           'sachet', 'shell', 'laurel', 'amaranth', 'sweet william'].some((k) => rawLower.includes(k)) ||
          ['serpentyn', 'ciasto ucieczki', 'budyń', 'koperta', 'wieniec', 'kwiat', 'saszetka', 'skorupa', 'szarłat', 'goździk', 'laurowiec'].some((k) => nameLower.includes(k))
        ) {
          itemCategory = 'bloodpoint';
        }
        // 8. Chests, Fog Reagents & Oaks (Chest spawns, fog density, hook distance)
        else if (
          ['coin', 'reagent', 'oak', 'vial'].some((k) => rawLower.includes(k)) ||
          ['moneta', 'odczynnik', 'dąb', 'flakon'].some((k) => nameLower.includes(k))
        ) {
          itemCategory = 'chest';
        }
        // 9. Maps / Realm Offerings
        else {
          itemCategory = 'map';
        }

        const matchesCat = itemCategory === selectedCategory;
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
            <option value="Common">{t.rarityCommon || 'Common'}</option>
            <option value="Uncommon">{t.rarityUncommon || 'Uncommon'}</option>
            <option value="Rare">{t.rarityRare || 'Rare'}</option>
            <option value="Very Rare">{t.rarityVeryRare || 'Very Rare'}</option>
            <option value="Ultra Rare">{t.rarityUltraRare || 'Ultra Rare'}</option>
            <option value="Event">{t.rarityEvent || 'Event'}</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'rarity_desc' | 'rarity_asc' | 'name_asc')}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer shadow-inner [&>option]:bg-slate-900 [&>option]:text-slate-100"
            aria-label={t.orderOfferings || 'Order offerings'}
          >
            <option value="rarity_asc">{t.sortRarityLowToHigh || 'Rarity: Low → High'}</option>
            <option value="rarity_desc">{t.sortRarityHighToLow || 'Rarity: High → Low'}</option>
            <option value="name_asc">{t.sortNameAsc || 'Name: A → Z'}</option>
          </select>
        </div>
      </div>

      {/* Main Container with Centered Category Buttons Straddling the Top Border */}
      <div className="relative mt-8 pt-8 pb-5 px-5 sm:px-6 rounded-3xl bg-slate-950/40 border border-slate-800 shadow-lg w-full">
        {/* Buttons Centered on the Top Border */}
        <div className="absolute -top-5 inset-x-0 flex justify-center z-10 px-2 pointer-events-none">
          <div
            role="tablist"
            aria-label={t.offeringCategories || 'Offering categories'}
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
            {activeCategoryConfig.label} {t.bulletSeparator || '•'} {t.offerings || 'Offerings'} ({sortedAndFilteredOfferings.length})
          </h3>
        </div>

        {/* Offerings Grid */}
        {sortedAndFilteredOfferings.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-center text-slate-500 text-xs italic">
            {t.noOfferingsFound || 'No offerings found in this category matching your active filter.'}
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
                    setActiveHover({ item: offering, rect, category: activeCategoryConfig.label });
                  }}
                  onMouseLeave={() => setActiveHover(null)}
                  className={`relative group rounded-2xl border-2 p-2 flex items-center justify-center cursor-pointer transition-colors duration-150 hover:brightness-110 active:opacity-90 focus:outline-none focus:ring-2 focus:ring-amber-500 h-20 w-20 sm:h-24 sm:w-24 ${rarityStyle.bg}`}
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

      {/* Unified Hover Modal */}
      <UnifiedHoverModal
        activeHover={activeHover}
        placement="above"
        t={t}
        actionPrompt={t.clickOfferingForDetails || t.clickToInspect || 'Click offering for details'}
      />
    </section>
  );
};


