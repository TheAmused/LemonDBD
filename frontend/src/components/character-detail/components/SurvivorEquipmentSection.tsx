// frontend/src/components/character-detail/components/SurvivorEquipmentSection.tsx
import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Sparkles,
  ShieldAlert,
  Heart,
  Wrench,
  Flashlight,
  Key,
  Map as MapIcon,
  Bomb,
} from 'lucide-react';
import {
  AddonItem,
  EquipmentItem,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank,
  renderFormattedDbdText,
} from '../types';

interface SurvivorEquipmentSectionProps {
  items?: EquipmentItem[];
  addons?: (AddonItem | EquipmentItem)[];
  backendBase: string;
  onSelectEquipment: (item: AddonItem | EquipmentItem) => void;
  t: Record<string, string>;
}

type SurvivorCategoryKey =
  | 'medkit'
  | 'toolbox'
  | 'flashlight'
  | 'key'
  | 'map'
  | 'firecracker'
  | 'trial_exclusive';

export const SurvivorEquipmentSection: React.FC<SurvivorEquipmentSectionProps> = ({
  items = [],
  addons = [],
  backendBase,
  onSelectEquipment,
  t,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SurvivorCategoryKey>('medkit');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [activeHover, setActiveHover] = useState<{
    item: AddonItem | EquipmentItem;
    rect: DOMRect;
    accentColor: string;
  } | null>(null);

  const isMedKit = (name: string, target?: string) =>
    name.toLowerCase().includes('med-kit') ||
    name.toLowerCase().includes('lunchbox') ||
    (target || '').toLowerCase().includes('med-kit');

  const isToolbox = (name: string, target?: string) =>
    name.toLowerCase().includes('toolbox') ||
    name.toLowerCase().includes('tools') ||
    (target || '').toLowerCase().includes('toolbox');

  const isFlashlight = (name: string, target?: string) =>
    name.toLowerCase().includes('flashlight') ||
    name.toLowerCase().includes('wisp') ||
    (target || '').toLowerCase().includes('flashlight');

  const isKey = (name: string, target?: string) =>
    name.toLowerCase().includes('key') || (target || '').toLowerCase().includes('key');

  const isMap = (name: string, target?: string) =>
    name.toLowerCase().includes('map') || (target || '').toLowerCase().includes('map');

  const isFirecracker = (name: string, target?: string) =>
    name.toLowerCase().includes('firecracker') ||
    name.toLowerCase().includes('party starter') ||
    name.toLowerCase().includes('flashbang') ||
    name.toLowerCase().includes('firework') ||
    (target || '').toLowerCase().includes('firecracker');

  const isTrialExclusive = (name: string) => {
    const n = name.toLowerCase();
    return (
      n.includes('vecna') ||
      n.includes('lament') ||
      n.includes('turret') ||
      n.includes('emp') ||
      n.includes('spray') ||
      n.includes('vaccine') ||
      n.includes('vhs') ||
      n.includes('flash grenade') ||
      n.includes('antidote') ||
      n.includes('candelabra') ||
      n.includes('lantern') ||
      n.includes('keycard') ||
      n.includes('mirror') ||
      n.includes('pendant') ||
      n.includes('blood can') ||
      n.includes('fungus') ||
      n.includes('crystal')
    );
  };

  const categories = [
    { key: 'medkit', label: 'Med-Kits', icon: Heart, desc: 'Healing & Syringes' },
    { key: 'toolbox', label: 'Toolboxes', icon: Wrench, desc: 'Repairs & Sabotage' },
    { key: 'flashlight', label: 'Flashlights', icon: Flashlight, desc: 'Blinding & Saves' },
    { key: 'key', label: 'Keys', icon: Key, desc: 'Auras & Hatch' },
    { key: 'map', label: 'Maps', icon: MapIcon, desc: 'Objectives & Totems' },
    { key: 'firecracker', label: 'Firecrackers', icon: Bomb, desc: 'Fireworks & Party Starters' },
    { key: 'trial_exclusive', label: 'Trial Artifacts', icon: ShieldAlert, desc: 'In-Trial Counter Items' },
  ];

  const categorizedData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filterItem = (it: EquipmentItem | AddonItem) => {
      const matchesSearch =
        !query ||
        it.name.toLowerCase().includes(query) ||
        Boolean(it.description && it.description.toLowerCase().includes(query));

      const itemRarity = (it.rarity || '').toLowerCase();
      const matchesRarity =
        rarityFilter === 'all' || itemRarity.includes(rarityFilter.toLowerCase());

      return matchesSearch && matchesRarity;
    };

    const filteredItems = items.filter(filterItem);
    const filteredAddons = addons.filter(filterItem);

    const matchesCategory = (it: EquipmentItem | AddonItem, isAddon: boolean) => {
      const target = (it as { associated_target?: string }).associated_target || '';
      if (selectedCategory === 'medkit') return isMedKit(it.name, target);
      if (selectedCategory === 'toolbox') return isToolbox(it.name, target);
      if (selectedCategory === 'flashlight') return isFlashlight(it.name, target);
      if (selectedCategory === 'key') return isKey(it.name, target);
      if (selectedCategory === 'map') return isMap(it.name, target);
      if (selectedCategory === 'firecracker') return isFirecracker(it.name, target);
      if (selectedCategory === 'trial_exclusive') return !isAddon && isTrialExclusive(it.name);
      return true;
    };

    const sortByRarity = (a: EquipmentItem | AddonItem, b: EquipmentItem | AddonItem) => {
      const rankA = getRarityRank(a.rarity);
      const rankB = getRarityRank(b.rarity);
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    };

    return {
      displayedItems: filteredItems
        .filter((it) => matchesCategory(it, false))
        .sort(sortByRarity),
      displayedAddons: filteredAddons
        .filter((ad) => matchesCategory(ad, true))
        .sort(sortByRarity),
    };
  }, [items, addons, selectedCategory, searchQuery, rarityFilter]);

  const activeCategoryConfig =
    categories.find((c) => c.key === selectedCategory) || categories[0];

  return (
    <section className="space-y-4 w-full">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 font-mono tracking-tight">
              {t.equipmentTitleSurvivor || 'Survival Items & Equipment'}
            </h2>
            <p className="text-xs text-slate-400">
              {t.equipmentDescSurvivor || 'Select an item category to explore items and their compatible add-on attachments.'}
            </p>
          </div>
        </div>

        {/* Search & Rarity Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder={t.searchEquipment || 'Filter name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
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
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        {/* Left Side Navigation */}
        <div className="flex md:flex-col items-center justify-start gap-2 p-2 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0 overflow-x-auto md:overflow-x-visible">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                type="button"
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key as SurvivorCategoryKey)}
                className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex flex-col items-center justify-center p-1.5 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/60 scale-105'
                    : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title={`${cat.label} - ${cat.desc}`}
                aria-label={cat.label}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] font-mono font-bold truncate max-w-[48px] mt-0.5">
                  {cat.label.split(' ')[0]}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                )}
              </button>
            );
          })}
        </div>

        {/* 2-Column Split Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Usable Items Column */}
          <div className="flex flex-col p-4 rounded-3xl bg-slate-950/40 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                {activeCategoryConfig.label} &bull; Items ({categorizedData.displayedItems.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Click item for details</span>
            </div>

            {categorizedData.displayedItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs italic">
                No items found in this category matching your filter.
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 p-1">
                {categorizedData.displayedItems.map((item, idx) => {
                  const id = `item-${item.name}-${idx}`;
                  const rarityStyle = getRarityTileStyle(item.rarity);

                  return (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectEquipment(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectEquipment(item);
                        }
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveHover({ item, rect, accentColor: 'text-emerald-400' });
                      }}
                      onMouseLeave={() => setActiveHover(null)}
                      className={`relative group rounded-2xl border-2 p-1.5 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 w-20 sm:h-24 sm:w-24 ${rarityStyle.bg}`}
                      aria-label={`Inspect item: ${item.name}`}
                    >
                      <img
                        src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)}
                        alt={item.name}
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

          {/* Compatible Add-ons Column */}
          <div className="flex flex-col p-4 rounded-3xl bg-slate-950/40 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                {selectedCategory === 'trial_exclusive'
                  ? 'Artifact Mechanics'
                  : `Compatible Add-ons (${categorizedData.displayedAddons.length})`}
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {selectedCategory === 'trial_exclusive' ? 'Special Trial Rules' : 'Attach up to 2 per item'}
              </span>
            </div>

            {selectedCategory === 'trial_exclusive' ? (
              <div className="flex-1 flex flex-col justify-center p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-black text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>In-Trial Killer Counters & Artifacts</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  These unique artifacts (such as <em>Hand & Eye of Vecna</em>, <em>Lament Configuration</em>, <em>Remote Flame Turrets</em>, <em>EMPs</em>, <em>First Aid Sprays</em>, and <em>Vaccines</em>) cannot be equipped in the pre-game lobby.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  They are spawned inside the Trial grounds to interact directly with specific Killers&apos; powers and counteract their special abilities.
                </p>
              </div>
            ) : categorizedData.displayedAddons.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs italic">
                No compatible add-ons found for this item type.
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5 p-1">
                {categorizedData.displayedAddons.map((item, idx) => {
                  const id = `addon-${item.name}-${idx}`;
                  const rarityStyle = getRarityTileStyle(item.rarity);

                  return (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectEquipment(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectEquipment(item);
                        }
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveHover({ item, rect, accentColor: 'text-amber-400' });
                      }}
                      onMouseLeave={() => setActiveHover(null)}
                      className={`relative group rounded-2xl border-2 p-1.5 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 h-20 w-20 sm:h-24 sm:w-24 ${rarityStyle.bg}`}
                      aria-label={`Inspect addon: ${item.name}`}
                    >
                      <img
                        src={getAssetUrl(backendBase, item.icon_local_path, item.icon_url)}
                        alt={item.name}
                        className="h-full w-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
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
        </div>
      </div>

      {/* Clamped Tooltip */}
      {activeHover && typeof window !== 'undefined' && (() => {
        const tooltipWidth = 320;
        const left = Math.max(
          16,
          Math.min(window.innerWidth - tooltipWidth - 16, activeHover.rect.left + activeHover.rect.width / 2 - tooltipWidth / 2)
        );
        const top = activeHover.rect.bottom + 10;
        const rarityStyle = getRarityTileStyle(activeHover.item.rarity);

        return (
          <div
            style={{ position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${tooltipWidth}px` }}
            className="z-[99999] p-4 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
              <h4 className="text-sm font-black text-white truncate font-mono">{activeHover.item.name}</h4>
              {activeHover.item.rarity && (
                <span className={`text-[10px] font-bold uppercase font-mono ${rarityStyle.text}`}>
                  {activeHover.item.rarity}
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs max-h-48 overflow-y-auto leading-relaxed text-slate-200">
              {renderFormattedDbdText(activeHover.item.description || '', true)}
            </div>
            <span className={`block text-[10px] font-mono mt-2.5 text-right font-bold ${activeHover.accentColor}`}>
              {t.clickToInspect || 'Click to inspect full mechanics'} &rarr;
            </span>
          </div>
        );
      })()}
    </section>
  );
};

