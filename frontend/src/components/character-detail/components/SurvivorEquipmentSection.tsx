'use client';
// frontend/src/components/character-detail/components/SurvivorEquipmentSection.tsx
import { Tabs } from '@/components/common/Tabs';
import React, { useMemo } from 'react';
import { ShieldAlert, Wrench, Flashlight, Key, Map as MapIcon, Cloud } from 'lucide-react';
import { SparkleIcon, MedkitIcon } from '@/components/icons/DbdIcons';
import type {
  AddonItem,
  EquipmentItem,
  CharacterDetailDictionary} from '../types';
import {
  getAssetThumbUrl,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank
} from '../types';
import { CategoryPicker } from './CategoryPicker';
import type { SurvivorCategoryKey } from '../survivorCategories';
import {
  getSurvivorAddonCategory,
  getSurvivorItemCategory,
  isSurvivorCategoryKey,
} from '../survivorCategories';
import { toTitleCase } from '@/utils/textCase';
import { usePersistentString } from '@/hooks/usePersistentString';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';

import { tip } from '@/components/common/Tooltip';
import { EmptyState } from '@/components/common/EmptyState';
import { AccordionSection } from '@/components/common/AccordionSection';
import { TileButton } from '@/components/common/TileButton';
import { Img } from '@/components/common/Img';
import { fallbackThroughSources } from '@/utils/thumbUrl';
interface SurvivorEquipmentSectionProps {
  items?: EquipmentItem[];
  addons?: (AddonItem | EquipmentItem)[];
  backendBase: string;
  onSelectEquipment: (item: AddonItem | EquipmentItem) => void;
  t: CharacterDetailDictionary;
}

export const CATEGORY_ICONS: Record<SurvivorCategoryKey, React.ComponentType<{ className?: string }>> = {
  medkit: MedkitIcon,
  toolbox: Wrench,
  flashlight: Flashlight,
  key: Key,
  map: MapIcon,
  fog_vial: Cloud,
  event: SparkleIcon,
  trial_exclusive: ShieldAlert,
};

export const SurvivorEquipmentSection: React.FC<SurvivorEquipmentSectionProps> = ({
  items = [],
  addons = [],
  backendBase,
  onSelectEquipment,
  t,
}) => {
  const [selectedCategory, setSelectedCategory] = usePersistentString<SurvivorCategoryKey>(
    'lemondbd_survivor_item_category',
    'medkit',
    isSurvivorCategoryKey
  );
  const [isDrawerOpen, toggleDrawer] = usePersistentDrawer('lemondbd_drawer_survivor_items', true);

  const categories = useMemo(
    () => [
      { key: 'medkit' as const, label: t.categoryMedkit, icon: CATEGORY_ICONS.medkit, desc: t.categoryMedkitDesc },
      { key: 'toolbox' as const, label: t.categoryToolbox, icon: CATEGORY_ICONS.toolbox, desc: t.categoryToolboxDesc },
      { key: 'flashlight' as const, label: t.categoryFlashlight, icon: CATEGORY_ICONS.flashlight, desc: t.categoryFlashlightDesc },
      { key: 'key' as const, label: t.categoryKey, icon: CATEGORY_ICONS.key, desc: t.categoryKeyDesc },
      { key: 'map' as const, label: t.categoryMapItem, icon: CATEGORY_ICONS.map, desc: t.categoryMapItemDesc },
      { key: 'fog_vial' as const, label: t.categoryFogVial, icon: CATEGORY_ICONS.fog_vial, desc: t.categoryFogVialDesc },
      { key: 'event' as const, label: t.categoryEventItems, icon: CATEGORY_ICONS.event, desc: t.categoryEventItemsDesc },
      { key: 'trial_exclusive' as const, label: t.categoryTrialArtifacts, icon: CATEGORY_ICONS.trial_exclusive, desc: t.categoryTrialArtifactsDesc },
    ],
    [t]
  );

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
    <AccordionSection
      as="section"
      titleId="survivor-equipment-heading"
      title={t.equipmentTitleSurvivor}
      open={isDrawerOpen}
      onToggle={toggleDrawer}
      className="mt-8"
      bodyClassName="p-6 sm:p-8"
    >
      <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <Tabs
          ariaLabel={t.equipmentCategories}
          value={selectedCategory}
          onChange={setSelectedCategory}
          panels={false}
          variant="pill"
          accent="green"
          className="hidden sm:flex md:flex-col md:items-stretch md:overflow-x-visible justify-start gap-2 p-2 rounded-card bg-bg-elevated shrink-0"
          tabClassName="relative h-12 w-14 sm:h-14 sm:w-16 flex-col gap-0 rounded-control p-1.5"
          tabs={categories.map((cat) => {
            const Icon = cat.icon;
            return {
              value: cat.key as SurvivorCategoryKey,
              icon: <Icon className="icon-lg sm:icon-xl" aria-hidden="true" />,
              label: (
                <span className="mt-0.5 block max-w-14 truncate text-micro font-bold">{cat.label.split(' ')[0]}</span>
              ),
              buttonProps: { ...tip(cat.desc, undefined, 'default'), 'aria-label': cat.label },
            };
          })}
        />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-color">
          <div className="flex flex-col p-4">
            <div className="sm:hidden mb-3">
              <CategoryPicker
                categories={categories}
                selectedKey={selectedCategory}
                onSelect={(key) => setSelectedCategory(key as SurvivorCategoryKey)}
                ariaLabel={t.equipmentCategories}
                accent="green"
              />
            </div>
            <h3 className="hidden sm:block text-center type-label-sm text-accent-green mb-4">
              {t.items} ({categorizedData.displayedItems.length})
            </h3>

            {categorizedData.displayedItems.length === 0 ? (
              <EmptyState variant="inline" className="flex-1 py-8 text-center" title={t.noItemsFound} />
            ) : (
              <ul className="flex flex-wrap items-center justify-center gap-3 p-1">
                {categorizedData.displayedItems.map((item, idx) => {
                  const id = `item-${item.name}-${idx}`;
                  const rarityStyle = getRarityTileStyle(item.rarity);

                  return (
                    <li key={id}>
                      <TileButton
                        onClick={() => onSelectEquipment(item)}
                        {...tip(item.name, undefined, 'item')}
                        className={`relative group rounded-card border-2 p-1.5 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:ring-accent-green h-20 w-20 sm:h-24 sm:w-24 ${rarityStyle.bg}`}
                        style={rarityStyle.style}
                        aria-label={`${t.inspectItemPrefix} ${item.name}`}
                      >
                        <Img
                          src={getAssetThumbUrl(backendBase, item.icon_local_path, item.icon_url)}
                          alt={item.name}
                          className="h-full w-full object-contain"
                          onError={fallbackThroughSources(getAssetUrl(backendBase, item.icon_local_path, item.icon_url))}
                        />
                      </TileButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col p-4">
            <h3 className="text-center type-label-sm text-text-secondary mb-4">
              {selectedCategory === 'trial_exclusive'
                ? t.specialTrialRules
                : `${t.compatibleAddons} (${categorizedData.displayedAddons.length})`}
            </h3>

            {selectedCategory === 'trial_exclusive' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-card bg-accent-amber/10 border border-accent-amber/30 text-center text-xs space-y-3">
                <div className="flex items-center justify-center gap-2 text-accent-amber type-card-title">
                  <ShieldAlert className="icon-lg shrink-0" aria-hidden="true" />
                  <span>{t.inTrialArtifactsHeading}</span>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  {t.trialArtifactsDesc1}
                </p>
                <p className="text-text-secondary leading-relaxed">
                  {t.trialArtifactsDesc2}
                </p>
              </div>
            ) : categorizedData.displayedAddons.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-text-muted text-xs italic">
                {t.noCompatibleAddons}
              </div>
            ) : (
              <ul className="flex flex-wrap items-center justify-center gap-2.5 p-1">
                {categorizedData.displayedAddons.map((item, idx) => {
                  const id = `addon-${item.name}-${idx}`;
                  const rarityStyle = getRarityTileStyle(item.rarity);
                  const displayItem = { ...item, name: toTitleCase(item.name) };

                  return (
                    <li key={id}>
                      <TileButton
                        onClick={() => onSelectEquipment(displayItem)}
                        {...tip(displayItem.name, undefined, 'item')}
                        className={`relative group rounded-card border-2 p-1.5 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:ring-accent-amber h-20 w-20 sm:h-24 sm:w-24 ${rarityStyle.bg}`}
                        style={rarityStyle.style}
                        aria-label={`${t.inspectAddonPrefix} ${displayItem.name}`}
                      >
                        <Img
                          src={getAssetThumbUrl(backendBase, item.icon_local_path, item.icon_url)}
                          alt={displayItem.name}
                          className="h-full w-full object-contain filter drop-shadow-md"
                          onError={fallbackThroughSources(getAssetUrl(backendBase, item.icon_local_path, item.icon_url))}
                        />
                      </TileButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      </div>
    </AccordionSection>
  );
};

