// frontend/src/components/character-detail/components/SurvivorEquipmentSection.tsx
import React, { useState, useMemo } from 'react';
import {
  Package,
  ShieldAlert,
  Heart,
  Wrench,
  Flashlight,
  Key,
  Map as MapIcon,
  Sparkles,
  Cloud,
  type LucideIcon,
} from 'lucide-react';
import {
  AddonItem,
  EquipmentItem,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank,
} from '../types';
import { UnifiedHoverModal, ActiveHoverState } from './UnifiedHoverModal';

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
  | 'fog_vial'
  | 'event'
  | 'trial_exclusive';

function getSurvivorItemCategory(it: EquipmentItem): SurvivorCategoryKey {
  const cat = (it.category || '').toLowerCase();
  const rarity = (it.rarity || '').toLowerCase();
  const name = (it.raw_name || it.name || '').toLowerCase();

  if (cat === 'event' || rarity === 'event') return 'event';
  if (cat === 'fog vial' || cat === 'fog_vial' || cat.includes('fog') || cat.includes('vial')) return 'fog_vial';
  if (cat === 'trial artifact' || cat === 'trial_exclusive' || cat === 'special' || cat.includes('trial') || cat.includes('artifact')) return 'trial_exclusive';
  if (cat === 'med-kit' || cat === 'medkit' || cat.includes('med') || cat.includes('aid')) return 'medkit';
  if (cat === 'toolbox' || cat.includes('tool')) return 'toolbox';
  if (cat === 'flashlight' || cat.includes('flash') || cat.includes('torch')) return 'flashlight';
  if (cat === 'key') return 'key';
  if (cat === 'map') return 'map';
  if (cat === 'firecracker' || cat.includes('firecracker') || cat.includes('party')) return 'event';

  if (rarity === 'event' || ['anniversary', 'banquet', 'masquerade', 'lunchbox', 'will o', 'firecracker', 'party'].some((k) => name.includes(k))) return 'event';
  if (['medkit', 'aid'].some((k) => name.includes(k))) return 'medkit';
  if (['toolbox', 'tool'].some((k) => name.includes(k))) return 'toolbox';
  if (['flashlight', 'torch'].some((k) => name.includes(k))) return 'flashlight';
  if (name.includes('key')) return 'key';
  if (name.includes('map')) return 'map';

  return 'trial_exclusive';
}

function getSurvivorAddonCategory(it: AddonItem): SurvivorCategoryKey {
  const target = (it.associated_target || '').toLowerCase();
  const cat = (it.category || '').toLowerCase();
  const rarity = (it.rarity || '').toLowerCase();
  const name = (it.raw_name || it.name || '').toLowerCase();

  if (rarity === 'event' || target === 'event' || cat === 'event') return 'event';
  if (target === 'fog vials' || target.includes('fog') || target.includes('vial')) return 'fog_vial';
  if (target === 'med-kits' || target.includes('med') || target.includes('aid')) return 'medkit';
  if (target === 'toolboxes' || target.includes('tool')) return 'toolbox';
  if (target === 'flashlights' || target.includes('flash') || target.includes('torch')) return 'flashlight';
  if (target === 'keys' || target.includes('key')) return 'key';
  if (target === 'maps' || target.includes('map')) return 'map';

  if (rarity === 'event' || name.includes('serum') || name.includes('broken bulb')) return 'event';

  return 'trial_exclusive';
}

const CATEGORY_ICONS: Record<SurvivorCategoryKey, LucideIcon> = {
  medkit: Heart,
  toolbox: Wrench,
  flashlight: Flashlight,
  key: Key,
  map: MapIcon,
  fog_vial: Cloud,
  event: Sparkles,
  trial_exclusive: ShieldAlert,
};

export const SurvivorEquipmentSection: React.FC<SurvivorEquipmentSectionProps> = ({
  items = [],
  addons = [],
  backendBase,
  onSelectEquipment,
  t,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SurvivorCategoryKey>('medkit');
  const [activeHover, setActiveHover] = useState<ActiveHoverState | null>(null);

  const categories = useMemo(
    () => [
      { key: 'medkit' as const, label: t.categoryMedkit || 'Med-Kits', icon: CATEGORY_ICONS.medkit, desc: t.categoryMedkitDesc || 'Healing & Syringes' },
      { key: 'toolbox' as const, label: t.categoryToolbox || 'Toolboxes', icon: CATEGORY_ICONS.toolbox, desc: t.categoryToolboxDesc || 'Repairs & Sabotage' },
      { key: 'flashlight' as const, label: t.categoryFlashlight || 'Flashlights', icon: CATEGORY_ICONS.flashlight, desc: t.categoryFlashlightDesc || 'Blinding & Saves' },
      { key: 'key' as const, label: t.categoryKey || 'Keys', icon: CATEGORY_ICONS.key, desc: t.categoryKeyDesc || 'Auras & Hatch' },
      { key: 'map' as const, label: t.categoryMapItem || 'Maps', icon: CATEGORY_ICONS.map, desc: t.categoryMapItemDesc || 'Objectives & Totems' },
      { key: 'fog_vial' as const, label: t.categoryFogVial || 'Fog Vials', icon: CATEGORY_ICONS.fog_vial, desc: t.categoryFogVialDesc || 'Mist & Concealment' },
      { key: 'event' as const, label: t.categoryEventItems || 'Event Items & Add-ons', icon: CATEGORY_ICONS.event, desc: t.categoryEventItemsDesc || 'Limited Time & Anniversary Items' },
      { key: 'trial_exclusive' as const, label: t.categoryTrialArtifacts || 'Trial Artifacts', icon: CATEGORY_ICONS.trial_exclusive, desc: t.categoryTrialArtifactsDesc || 'In-Trial Counter Items' },
    ],
    [t]
  );

  const activeCategoryConfig = useMemo(() => {
    return categories.find((c) => c.key === selectedCategory) || categories[0];
  }, [categories, selectedCategory]);

  const categorizedData = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const safeAddons = Array.isArray(addons) ? addons : [];

    const isMatch = (it: EquipmentItem | AddonItem, isAddon: boolean): boolean => {
      const itemCategory = isAddon
        ? getSurvivorAddonCategory(it as AddonItem)
        : getSurvivorItemCategory(it as EquipmentItem);

      return itemCategory === selectedCategory;
    };

    const sortByRarity = (a: EquipmentItem | AddonItem, b: EquipmentItem | AddonItem) => {
      const rankA = getRarityRank(a.rarity);
      const rankB = getRarityRank(b.rarity);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || '');
    };

    return {
      displayedItems: safeItems.filter((it) => isMatch(it, false)).sort(sortByRarity),
      displayedAddons: safeAddons.filter((ad) => isMatch(ad as AddonItem, true)).sort(sortByRarity),
    };
  }, [items, addons, selectedCategory]);

  return (
    <section className="space-y-4 w-full" aria-labelledby="survivor-equipment-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" aria-hidden="true">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <h2 id="survivor-equipment-heading" className="text-lg sm:text-xl font-black text-slate-100 font-mono tracking-tight">
              {t.equipmentTitleSurvivor || 'Survival Items & Equipment'}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div
          role="tablist"
          aria-label={t.equipmentCategories || 'Survivor item categories'}
          className="flex md:flex-col items-center justify-start gap-2 p-2 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0 overflow-x-auto md:overflow-x-visible"
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
                onClick={() => setSelectedCategory(cat.key as SurvivorCategoryKey)}
                className={`relative h-12 w-14 sm:h-14 sm:w-16 rounded-2xl flex flex-col items-center justify-center p-1.5 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/60 scale-105'
                    : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title={`${cat.label} - ${cat.desc}`}
                aria-label={cat.label}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                <span className="text-[9px] font-mono font-bold truncate max-w-[56px] mt-0.5">
                  {cat.label.split(' ')[0]}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col p-4 rounded-3xl bg-slate-950/40 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Package className="h-4 w-4" aria-hidden="true" />
                {activeCategoryConfig.label} {t.bulletSeparator || '•'} {t.items || 'Items'} ({categorizedData.displayedItems.length})
              </h3>
            </div>

            {categorizedData.displayedItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs italic">
                {t.noItemsFound || 'No items found in this category matching your filter.'}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3 p-1" role="list">
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
                      aria-label={`${t.inspectItemPrefix || 'Inspect item:'} ${item.name}`}
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
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {selectedCategory === 'trial_exclusive'
                  ? t.artifactMechanics || 'Artifact Mechanics'
                  : `${t.compatibleAddons || 'Compatible Add-ons'} (${categorizedData.displayedAddons.length})`}
              </h3>
              {selectedCategory === 'trial_exclusive' && (
                <span className="text-[10px] font-mono text-slate-400">
                  {t.specialTrialRules || 'Special Trial Rules'}
                </span>
              )}
            </div>

            {selectedCategory === 'trial_exclusive' ? (
              <div className="flex-1 flex flex-col justify-center p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-black text-sm">
                  <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{t.inTrialArtifactsHeading || 'In-Trial Killer Counters & Artifacts'}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {t.trialArtifactsDesc1 || 'These unique artifacts (such as Hand & Eye of Vecna, Lament Configuration, Remote Flame Turrets, EMPs, First Aid Sprays, and Vaccines) cannot be equipped in the pre-game lobby.'}
                </p>
                <p className="text-slate-400 leading-relaxed">
                  {t.trialArtifactsDesc2 || "They are spawned inside the Trial grounds to interact directly with specific Killers' powers and counteract their special abilities."}
                </p>
              </div>
            ) : categorizedData.displayedAddons.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs italic">
                {t.noCompatibleAddons || 'No compatible add-ons found for this item type.'}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5 p-1" role="list">
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
                      aria-label={`${t.inspectAddonPrefix || 'Inspect addon:'} ${item.name}`}
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

      {/* Unified Hover Modal */}
      <UnifiedHoverModal
        activeHover={activeHover}
        placement="above"
        t={t}
        actionPrompt={t.clickItemForDetails || t.clickToInspect || 'Click item for details'}
      />
    </section>
  );
};

