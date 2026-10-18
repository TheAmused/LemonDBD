'use client';
// frontend/src/components/character-detail/components/OfferingsSection.tsx
import { Tabs } from '@/components/common/Tabs';
import React, { useMemo } from 'react';
import {
  Gift,
  Coins,
  Map as MapIcon,
  EyeOff,
  Sparkles,
  Layers,
  Box,
} from 'lucide-react';
import {
  OfferingItem,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank,
  CharacterDetailDictionary,
} from '../types';
import { CategoryPicker } from './CategoryPicker';
import { CollapsibleDrawer } from './CollapsibleDrawer';
import { MoriCharmIcon, WardCharmIcon } from '@/components/icons/DbdIcons';
import { usePersistentString } from '@/hooks/usePersistentString';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';

import { tip } from '@/components/common/Tooltip';
import { EmptyState } from '@/components/common/EmptyState';
import { SectionHeading } from '@/components/common/SectionHeading';
import { isKiller as isKillerRole } from '@/utils/characterUtils';
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
const KILLER_OFFERING_KEYS = ['special', 'mori', 'bloodpoint', 'map', 'shroud', 'ward'] as const;
const SURVIVOR_OFFERING_KEYS = ['special', 'bloodpoint', 'luck', 'map', 'shroud', 'blueprint', 'chest', 'ward'] as const;

interface OfferingsSectionProps {
  offerings?: OfferingItem[];
  role: 'Killer' | 'Survivor';
  backendBase: string;
  onSelectOffering?: (item: OfferingItem) => void;
  t: CharacterDetailDictionary;
}

interface OfferingCategoryConfig {
  key: string;
  label: string;
  /** Any icon component (lucide or a custom DbdIcons SVG). */
  icon: React.ElementType;
  desc: string;
}

export const OfferingsSection: React.FC<OfferingsSectionProps> = ({
  offerings = [],
  role,
  backendBase,
  onSelectOffering,
  t,
}) => {
  const isKiller = isKillerRole(role);

  const categories = useMemo<OfferingCategoryConfig[]>(() => {
    if (isKiller) {
      return [
        {
          key: 'special',
          label: t.categorySpecial,
          icon: Sparkles,
          desc: t.categorySpecialDesc,
        },
        {
          key: 'mori',
          label: t.categoryMori,
          icon: MoriCharmIcon,
          desc: t.categoryMoriDesc,
        },
        {
          key: 'bloodpoint',
          label: t.categoryBloodpoints,
          icon: Coins,
          desc: t.categoryBloodpointsDesc,
        },
        {
          key: 'map',
          label: t.categoryMap,
          icon: MapIcon,
          desc: t.categoryMapDesc,
        },
        {
          key: 'shroud',
          label: t.categoryShroud,
          icon: EyeOff,
          desc: t.categoryShroudDesc,
        },
        {
          key: 'ward',
          label: t.categoryWard,
          icon: WardCharmIcon,
          desc: t.categoryWardDescKiller,
        },
      ];
    }
    return [
      {
        key: 'special',
        label: t.categorySpecial,
        icon: Sparkles,
        desc: t.categorySpecialDesc,
      },
      {
        key: 'bloodpoint',
        label: t.categoryBloodpoints,
        icon: Coins,
        desc: t.categoryBloodpointsDesc,
      },
      {
        key: 'luck',
        label: t.categoryLuck,
        icon: Sparkles,
        desc: t.categoryLuckDesc,
      },
      {
        key: 'map',
        label: t.categoryMap,
        icon: MapIcon,
        desc: t.categoryMapDesc,
      },
      {
        key: 'shroud',
        label: t.categoryShroud,
        icon: EyeOff,
        desc: t.categoryShroudDesc,
      },
      {
        key: 'blueprint',
        label: t.categoryBlueprint,
        icon: Layers,
        desc: t.categoryBlueprintDesc,
      },
      {
        key: 'chest',
        label: t.categoryChest,
        icon: Box,
        desc: t.categoryChestDesc,
      },
      {
        key: 'ward',
        label: t.categoryWard,
        icon: WardCharmIcon,
        desc: t.categoryWardDescSurvivor,
      },
    ];
  }, [isKiller, t]);

  const [selectedCategory, setSelectedCategory] = usePersistentString(
    `lemondbd_offering_category_${role.toLowerCase()}`,
    isKiller ? 'mori' : 'bloodpoint',
    (value): value is string =>
      (isKiller ? (KILLER_OFFERING_KEYS as readonly string[]) : (SURVIVOR_OFFERING_KEYS as readonly string[])).includes(
        value
      )
  );
  const [isDrawerOpen, , setDrawerOpen] = usePersistentDrawer('lemondbd_drawer_offerings', true);

  const activeCategoryConfig =
    categories.find((c) => c.key === selectedCategory) || categories[0];

  const sortedAndFilteredOfferings = useMemo(() => {
    return offerings
      .filter((off) => {
        const raw = (off.raw_name || off.name || '').trim();
        const rawLower = raw.toLowerCase();
        const nameLower = (off.name || '').toLowerCase();
        const catLower = (off.category || '').toLowerCase();
        const rarityLower = (off.rarity || '').toLowerCase();

        let itemCategory = 'map';

        // 1. Memento Mori
        if (
          rawLower.includes('memento mori') ||
          nameLower.includes('memento mori') ||
          raw === 'Cypress Memento Mori' ||
          raw === 'Ivory Memento Mori' ||
          raw === 'Ebony Memento Mori'
        ) {
          itemCategory = 'mori';
        }
        // 2. Special / Event Offerings
        else if (
          rarityLower === 'event' ||
          catLower === 'special' ||
          [
            'gateau',
            'flan',
            'cobbler',
            'terrormisu',
            'sacrificial cake',
            'torte',
            'scream pie',
            'pustula',
            'cursed seed',
            'bbq invitation',
            'red envelope',
            'bloodshot eye',
            'dowsing',
            'dousing',
          ].some((k) => rawLower.includes(k) || nameLower.includes(k))
        ) {
          itemCategory = 'special';
        }
        // 3. Wards
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
        // 4. Shrouds
        else if (rawLower.includes('shroud') || nameLower.includes('całun') || nameLower.includes('schleier')) {
          itemCategory = 'shroud';
        }
        // 5. Blueprints
        else if (rawLower.includes('blueprint') || nameLower.includes('plan') || nameLower.includes('blaupause')) {
          itemCategory = 'blueprint';
        }
        // 6. Luck Charms
        else if (
          ['chalk', 'salt', 'salty lips', 'statuette'].some((k) => rawLower.includes(k)) ||
          nameLower.includes('kreda') ||
          nameLower.includes('sól') ||
          nameLower.includes('szczęśc')
        ) {
          itemCategory = 'luck';
        }
        // 7. Bloodpoints
        else if (
          [
            'streamers',
            'escape! cake',
            'pudding',
            'envelope',
            'wreath',
            'blossom',
            'sachet',
            'shell',
            'laurel',
            'amaranth',
            'sweet william',
          ].some((k) => rawLower.includes(k)) ||
          [
            'serpentyn',
            'ciasto ucieczki',
            'budyń',
            'koperta',
            'wieniec',
            'kwiat',
            'saszetka',
            'skorupa',
            'szarłat',
            'goździk',
            'laurowiec',
          ].some((k) => nameLower.includes(k))
        ) {
          itemCategory = 'bloodpoint';
        }
        // 8. Chests, Fog Reagents & Oaks
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

        return itemCategory === selectedCategory;
      })
      .sort((a, b) => {
        const rankA = getRarityRank(a.rarity);
        const rankB = getRarityRank(b.rarity);
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [offerings, selectedCategory]);

  if (!offerings || offerings.length === 0) return null;

  return (
    <Surface
      as="section" padding="lg" className="mt-8 shadow-sm dark:shadow-none backdrop-blur-md"
      aria-labelledby="offerings-heading"
    >
      {/* Same flat single-card shape as KillerEquipmentSection: one bordered
          card, header+count+chevron on top, category control and grid
          directly inside — no nested card and no border-straddling tab
          strip, so the two sections read as one visual family. */}
      <CollapsibleDrawer
        open={isDrawerOpen}
        onOpenChange={setDrawerOpen}
        headerClassName="pb-4 mb-6 border-b border-border-color"
        header={
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-card border ${
                isKiller
                  ? 'bg-accent-red/10 text-accent-red border-accent-red/20'
                  : 'bg-accent-green/10 text-accent-green border-accent-green/20'
              }`}
            >
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <SectionHeading>
                {t.offeringsTitle}
                <Badge
                  tone={isKiller ? 'red' : 'green'} size="sm" plain
                >
                  {offerings.length}
                </Badge>
              </SectionHeading>
            </div>
          </div>
        }
      >
        {/* Below sm, this dropdown is the only category control — it
            replaces the tab strip entirely rather than sitting next to it. */}
        <div className="sm:hidden mb-4">
          <CategoryPicker
            categories={categories}
            selectedKey={selectedCategory}
            onSelect={setSelectedCategory}
            ariaLabel={t.offeringCategories}
            accent={isKiller ? 'red' : 'green'}
            countLabel={`(${sortedAndFilteredOfferings.length})`}
          />
        </div>

        <Tabs
          ariaLabel={t.offeringCategories}
          value={selectedCategory}
          onChange={setSelectedCategory}
          panels={false}
          variant="pill"
          accent={isKiller ? 'red' : 'green'}
          wrap
          centered
          className="hidden sm:flex mb-6"
          tabs={categories.map((cat) => {
            const Icon = cat.icon;
            return {
              value: cat.key,
              label: cat.label,
              icon: <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
              // The count only shows on the selected tab, same idea as the
              // mobile dropdown's countLabel.
              count: selectedCategory === cat.key ? sortedAndFilteredOfferings.length : undefined,
              buttonProps: { ...tip(`${cat.label} - ${cat.desc}`, undefined, 'default'), 'aria-label': `${cat.label} - ${cat.desc}` },
            };
          })}
        />

        {sortedAndFilteredOfferings.length === 0 ? (
          <EmptyState variant="inline" title={t.noOfferingsFound} />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3.5" role="list">
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
                  {...tip(offering.name, undefined, 'item')}
                  className={`relative group rounded-card border-2 p-2 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-red h-20 w-20 sm:h-24 sm:w-24 ${rarityStyle.bg}`}
                  style={rarityStyle.style}
                  aria-label={`${t.inspectOfferingPrefix} ${offering.name}`}
                >
                  <img
                    src={getAssetUrl(backendBase, offering.icon_local_path, offering.icon_url)}
                    alt={offering.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleDrawer>
    </Surface>
  );
};

