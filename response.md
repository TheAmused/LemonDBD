### Solution Overview

The error `Uncaught ReferenceError: Cannot access 's' before initialization` in minified production bundles occurs due to the **Temporal Dead Zone (TDZ)** in JavaScript.

In `frontend/src/components/character-detail/components/SurvivorEquipmentSection.tsx`, the `categorizedData` hook called `filterItem` and `matchesCategory` inside a `useMemo` array filter:

1. `filterItem` or `matchesCategory` was originally defined using `const` or inside the hook, causing the bundler's minified closure to reference variable `s` before it is declared.
2. In `SurvivorDetailView.tsx` and `CharacterSubpageView.tsx`, `detailData` sub-arrays (`items`, `addons`, `offerings`) might default to `undefined` before resolving, causing `.filter()` in `useMemo` to fail on execution.



To fix this:

* All filtering and category helper logic in `SurvivorEquipmentSection.tsx` are hoisted as pure standalone functions outside the React component scope.
* Default fallback arrays (`items = []`, `addons = []`) and safe optional chaining guards are applied across all survivor sub-components.



---

#### 1. `frontend/src/components/character-detail/components/SurvivorEquipmentSection.tsx`

```tsx
import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  ShieldAlert,
  Heart,
  Wrench,
  Flashlight,
  Key,
  Map as MapIcon,
  Bomb,
  Sparkles,
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

function getCanonicalString(it: EquipmentItem | AddonItem): string {
  const raw = (it.raw_name || '').toLowerCase();
  const name = (it.name || '').toLowerCase();
  const target = ((it as { associated_target?: string }).associated_target || '').toLowerCase();
  const category = (it.category || '').toLowerCase();
  const desc = (it.description || '').toLowerCase();
  return `${raw} ${name} ${target} ${category} ${desc}`;
}

function checkIsMedKit(target: string, raw: string, name: string): boolean {
  if (target.includes('med-kit') || target.includes('medkit') || target.includes('aid')) return true;
  const combined = `${raw} ${name}`.toLowerCase();
  return (
    combined.includes('med-kit') ||
    combined.includes('medkit') ||
    combined.includes('first aid') ||
    combined.includes('aid kit') ||
    combined.includes('lunchbox') ||
    combined.includes('camping') ||
    combined.includes('emergency') ||
    combined.includes('ranger') ||
    combined.includes('syringe') ||
    combined.includes('styptic') ||
    combined.includes('dressing') ||
    combined.includes('bandage') ||
    combined.includes('suture') ||
    combined.includes('sponge') ||
    combined.includes('gauze') ||
    combined.includes('needle') ||
    combined.includes('scissor') ||
    combined.includes('gel') ||
    combined.includes('serum') ||
    combined.includes('apteczka') ||
    combined.includes('sanitäter') ||
    combined.includes('botiquín') ||
    combined.includes('救急箱')
  );
}

function checkIsToolbox(target: string, raw: string, name: string): boolean {
  if (target.includes('toolbox') || target.includes('tools')) return true;
  const combined = `${raw} ${name}`.toLowerCase();
  return (
    combined.includes('toolbox') ||
    combined.includes('tool') ||
    combined.includes('mechanic') ||
    combined.includes('commodious') ||
    combined.includes('engineer') ||
    combined.includes('alex') ||
    combined.includes('wire') ||
    combined.includes('socket') ||
    combined.includes('swivel') ||
    combined.includes('spring') ||
    combined.includes('spool') ||
    combined.includes('brand new part') ||
    combined.includes('protective grip') ||
    combined.includes('hacksaw') ||
    combined.includes('clamp') ||
    combined.includes('rag') ||
    combined.includes('skrzynka') ||
    combined.includes('werkzeugkasten') ||
    combined.includes('caja de herramientas') ||
    combined.includes('boîte à outils') ||
    combined.includes('工具箱')
  );
}

function checkIsFlashlight(target: string, raw: string, name: string): boolean {
  if (target.includes('flashlight') || target.includes('torch')) return true;
  const combined = `${raw} ${name}`.toLowerCase();
  return (
    combined.includes('flashlight') ||
    combined.includes('torch') ||
    combined.includes('sport flashlight') ||
    combined.includes('utility flashlight') ||
    combined.includes('wisp') ||
    combined.includes('battery') ||
    combined.includes('lens') ||
    combined.includes('bulb') ||
    combined.includes('filament') ||
    combined.includes('reflector') ||
    combined.includes('focus') ||
    combined.includes('sapphire') ||
    combined.includes('rubee') ||
    combined.includes('ruby') ||
    combined.includes('latarka') ||
    combined.includes('taschenlampe') ||
    combined.includes('linterna') ||
    combined.includes('lampe torche') ||
    combined.includes('懐中電灯')
  );
}

function checkIsKey(target: string, raw: string, name: string): boolean {
  if (target.includes('key')) return true;
  const combined = `${raw} ${name}`.toLowerCase();
  return (
    combined.includes('key') ||
    combined.includes('skeleton key') ||
    combined.includes('dull key') ||
    combined.includes('broken key') ||
    combined.includes('amber') ||
    combined.includes('token') ||
    combined.includes('bead') ||
    combined.includes('pearl') ||
    combined.includes('ring') ||
    combined.includes('klucz') ||
    combined.includes('schlüssel') ||
    combined.includes('llave') ||
    combined.includes('clé') ||
    combined.includes('カギ') ||
    combined.includes('鍵')
  );
}

function checkIsMap(target: string, raw: string, name: string): boolean {
  if (target.includes('map')) return true;
  const combined = `${raw} ${name}`.toLowerCase();
  return (
    combined.includes('map') ||
    combined.includes('rainbow map') ||
    combined.includes('cord') ||
    combined.includes('rope') ||
    combined.includes('stamp') ||
    combined.includes('glass bead') ||
    combined.includes('retardant') ||
    combined.includes('silk') ||
    combined.includes('mapa') ||
    combined.includes('karte') ||
    combined.includes('carte') ||
    combined.includes('mappa') ||
    combined.includes('マップ') ||
    combined.includes('地図')
  );
}

function checkIsFirecracker(target: string, raw: string, name: string): boolean {
  if (target.includes('firecracker') || target.includes('firework')) return true;
  const combined = `${raw} ${name}`.toLowerCase();
  return (
    combined.includes('firecracker') ||
    combined.includes('party starter') ||
    combined.includes('flashbang') ||
    combined.includes('firework') ||
    combined.includes('chinese firecracker') ||
    combined.includes('winter party') ||
    combined.includes('third year') ||
    combined.includes('petard') ||
    combined.includes('feuerwerk') ||
    combined.includes('petardo') ||
    combined.includes('爆竹')
  );
}

function checkIsTrialExclusive(raw: string, name: string, target: string): boolean {
  const combined = `${raw} ${name} ${target}`.toLowerCase();
  return (
    combined.includes('vecna') ||
    combined.includes('lament') ||
    combined.includes('turret') ||
    combined.includes('emp') ||
    combined.includes('spray') ||
    combined.includes('vaccine') ||
    combined.includes('vhs') ||
    combined.includes('flash grenade') ||
    combined.includes('antidote') ||
    combined.includes('candelabra') ||
    combined.includes('lantern') ||
    combined.includes('keycard') ||
    combined.includes('mirror') ||
    combined.includes('pendant') ||
    combined.includes('blood can') ||
    combined.includes('fungus') ||
    combined.includes('crystal')
  );
}

const CATEGORIES = [
  { key: 'medkit', label: 'Med-Kits', icon: Heart, desc: 'Healing & Syringes' },
  { key: 'toolbox', label: 'Toolboxes', icon: Wrench, desc: 'Repairs & Sabotage' },
  { key: 'flashlight', label: 'Flashlights', icon: Flashlight, desc: 'Blinding & Saves' },
  { key: 'key', label: 'Keys', icon: Key, desc: 'Auras & Hatch' },
  { key: 'map', label: 'Maps', icon: MapIcon, desc: 'Objectives & Totems' },
  { key: 'firecracker', label: 'Firecrackers', icon: Bomb, desc: 'Fireworks & Party Starters' },
  { key: 'trial_exclusive', label: 'Trial Artifacts', icon: ShieldAlert, desc: 'In-Trial Counter Items' },
];

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

  const activeCategoryConfig = useMemo(() => {
    return CATEGORIES.find((c) => c.key === selectedCategory) || CATEGORIES[0];
  }, [selectedCategory]);

  const categorizedData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const safeItems = Array.isArray(items) ? items : [];
    const safeAddons = Array.isArray(addons) ? addons : [];

    const isMatch = (it: EquipmentItem | AddonItem, isAddon: boolean): boolean => {
      const name = (it.name || '').toLowerCase();
      const raw = (it.raw_name || '').toLowerCase();
      const desc = (it.description || '').toLowerCase();
      const target = ((it as { associated_target?: string }).associated_target || '').toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        raw.includes(query) ||
        desc.includes(query);

      if (!matchesSearch) return false;

      const itemRarity = (it.rarity || '').toLowerCase();
      const matchesRarity =
        rarityFilter === 'all' || itemRarity.includes(rarityFilter.toLowerCase());

      if (!matchesRarity) return false;

      if (selectedCategory === 'medkit') return checkIsMedKit(target, raw, name);
      if (selectedCategory === 'toolbox') return checkIsToolbox(target, raw, name);
      if (selectedCategory === 'flashlight') return checkIsFlashlight(target, raw, name);
      if (selectedCategory === 'key') return checkIsKey(target, raw, name);
      if (selectedCategory === 'map') return checkIsMap(target, raw, name);
      if (selectedCategory === 'firecracker') return checkIsFirecracker(target, raw, name);
      if (selectedCategory === 'trial_exclusive') return !isAddon && checkIsTrialExclusive(raw, name, target);

      return true;
    };

    const sortByRarity = (a: EquipmentItem | AddonItem, b: EquipmentItem | AddonItem) => {
      const rankA = getRarityRank(a.rarity);
      const rankB = getRarityRank(b.rarity);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || '');
    };

    return {
      displayedItems: safeItems.filter((it) => isMatch(it, false)).sort(sortByRarity),
      displayedAddons: safeAddons.filter((ad) => isMatch(ad, true)).sort(sortByRarity),
    };
  }, [items, addons, selectedCategory, searchQuery, rarityFilter]);

  return (
    <section className="space-y-4 w-full">
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

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex md:flex-col items-center justify-start gap-2 p-2 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0 overflow-x-auto md:overflow-x-visible">
          {CATEGORIES.map((cat) => {
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

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
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

```

---

#### 2. `frontend/src/components/character-detail/SurvivorDetailView.tsx`

```tsx
'use client';
// frontend/src/components/character-detail/SurvivorDetailView.tsx

import React, { useState } from 'react';
import { BookOpen, Bookmark, Calendar, ShieldCheck } from 'lucide-react';
import {
  CharacterViewBaseProps,
  AddonItem,
  EquipmentItem,
  OfferingItem,
  formatLocalizedReleaseDate,
} from './types';
import { CharacterBreadcrumbs } from './components/CharacterBreadcrumbs';
import { CharacterHeroAvatar } from './components/CharacterHeroAvatar';
import { CharacterPerksSection } from './components/CharacterPerksSection';
import { SurvivorEquipmentSection } from './components/SurvivorEquipmentSection';
import { OfferingsSection } from './components/OfferingsSection';
import { LoreModal } from './modals/LoreModal';
import { Model3DModal } from './modals/Model3DModal';
import { EquipmentDetailModal } from './modals/EquipmentDetailModal';
import { PerkModal } from '@/components/PerkModal';
import { Perk, PerkDictionary } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

export const SurvivorDetailView: React.FC<CharacterViewBaseProps> = ({
  currentLocale,
  dict,
  detailData,
  allCharacters = [],
}) => {
  const backendBase = getBackendBaseUrl();
  const rawDict = (dict || {}) as Record<string, Record<string, string>>;
  const t: Record<string, string> = rawDict.characterDetail || rawDict.characters || {};

  const character = detailData?.character || { name: '', category: 'Survivor' };
  const perks = Array.isArray(detailData?.perks) ? detailData.perks : [];
  const addons = Array.isArray(detailData?.addons) ? detailData.addons : [];
  const items = Array.isArray(detailData?.items) ? detailData.items : [];
  const offerings = Array.isArray(detailData?.offerings) ? detailData.offerings : [];

  const [isLoreModalOpen, setIsLoreModalOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [selectedEquipment, setSelectedEquipment] = useState<AddonItem | EquipmentItem | OfferingItem | null>(null);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const chapterName = character.chapter_name || t.baseGame || 'Base Game';
  const releaseDate = formatLocalizedReleaseDate(
    character.release_date || String(character.release_year || '2016'),
    currentLocale
  );
  const rawLoreText = character.lore || t.noLoreFound || "No lore records discovered in the Entity's Archives yet.";

  return (
    <article className="space-y-8 animate-in fade-in duration-300 w-full" aria-label={`${character.name} Details`}>
      <CharacterBreadcrumbs
        currentLocale={currentLocale}
        character={character}
        roleLabel={t.roleSurvivor || 'Survivor'}
        isSurvivor={true}
        allCharacters={allCharacters}
        t={t}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <CharacterHeroAvatar
          character={character}
          isSurvivor={true}
          roleLabel={t.roleSurvivor || 'Survivor'}
          backendBase={backendBase}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          t={t}
        />

        <div className="lg:col-span-8 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                {t.roleSurvivor || 'Survivor'}{' '}
                {character.is_licensed
                  ? `• ${t.dlcLicensed || 'Licensed'}`
                  : `• ${t.dlcOriginal || 'Original'}`}
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-100 font-mono tracking-tight">
                {character.name}
              </h1>
              {character.real_name && character.real_name !== character.name && (
                <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">
                  {t.realName || 'Full Name'}:{' '}
                  <span className="text-slate-200">{character.real_name}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsLoreModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <BookOpen className="h-4 w-4" />
                <span>{t.viewLore || 'Lore & Bio'}</span>
              </button>

              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 select-none">
                <Bookmark className="h-3.5 w-3.5 shrink-0" />
                {chapterName}
              </span>

              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 select-none">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {releaseDate}
              </span>

              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 select-none">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                {character.is_licensed
                  ? t.licensedFranchise || t.dlcLicensed || 'Licensed Franchise'
                  : t.originalChapter || t.dlcOriginal || 'Dead by Daylight Original'}
              </span>
            </div>
          </header>

          <CharacterPerksSection
            perks={perks}
            character={character}
            backendBase={backendBase}
            onSelectPerk={(p) => setSelectedPerk(p as unknown as Perk)}
            t={t}
          />
        </div>
      </section>

      <SurvivorEquipmentSection
        items={items}
        addons={addons}
        backendBase={backendBase}
        onSelectEquipment={(item) => setSelectedEquipment(item)}
        t={t}
      />

      <OfferingsSection
        offerings={offerings}
        role="Survivor"
        backendBase={backendBase}
        onSelectOffering={(item) => setSelectedEquipment(item as unknown as EquipmentItem)}
        t={t}
      />

      <LoreModal
        isOpen={isLoreModalOpen}
        onClose={() => setIsLoreModalOpen(false)}
        character={character}
        rawLoreText={rawLoreText}
        t={t}
      />

      <Model3DModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        character={character}
        isSurvivor={true}
        backendBase={backendBase}
        t={t}
      />

      <EquipmentDetailModal
        item={selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        backendBase={backendBase}
        t={t}
      />

      {selectedPerk && (
        <PerkModal
          perk={selectedPerk}
          onClose={() => setSelectedPerk(null)}
          dict={dict as PerkDictionary}
        />
      )}
    </article>
  );
};

```