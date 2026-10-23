'use client';
// frontend/src/components/character-detail/components/KillerEquipmentSection.tsx
import React, { useMemo } from 'react';
import type {
  AddonItem,
  EquipmentItem,
  CharacterDetailDictionary} from '../types';
import {
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank
} from '../types';
import { tip } from '@/components/common/Tooltip';
import { toTitleCase } from '@/utils/textCase';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { AccordionSection } from '@/components/common/AccordionSection';
import { TileButton } from '@/components/common/TileButton';
import { Img } from '@/components/common/Img';

interface KillerEquipmentSectionProps {
  addons?: (AddonItem | EquipmentItem)[];
  backendBase: string;
  onSelectEquipment: (item: AddonItem | EquipmentItem) => void;
  t: CharacterDetailDictionary;
}

export const KillerEquipmentSection: React.FC<KillerEquipmentSectionProps> = ({
  addons = [],
  backendBase,
  onSelectEquipment,
  t,
}) => {
  const [isDrawerOpen, toggleDrawer] = usePersistentDrawer('lemondbd_drawer_killer_addons', true);

  const sortedAddons = useMemo(() => {
    return [...addons].sort((a, b) => {
      const rankA = getRarityRank(a.rarity);
      const rankB = getRarityRank(b.rarity);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [addons]);

  return (
    <AccordionSection
      as="section"
      title={t.equipmentTitleKiller}
      open={isDrawerOpen}
      onToggle={toggleDrawer}
      className="mt-8"
      bodyClassName="p-6 sm:p-8"
    >
      {sortedAddons.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-muted">
          {t.noEquipment}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {sortedAddons.map((item, idx) => {
            const iconSrc = getAssetUrl(backendBase, item.icon_local_path, item.icon_url);
            const rarityStyle = getRarityTileStyle(item.rarity);
            const displayItem = { ...item, name: toTitleCase(item.name) };

            return (
              <TileButton
                key={`${item.name}-${idx}`}
                {...tip(displayItem.name, undefined, 'item')}
                onClick={() => onSelectEquipment(displayItem)}
                className={`relative group rounded-card border-2 p-2.5 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:ring-accent-red h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 shadow-lg ${rarityStyle.bg}`}
                style={rarityStyle.style}
              >
                <Img
                  src={iconSrc}
                  alt={displayItem.name}
                  className="h-full w-full object-contain filter drop-shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </TileButton>
            );
          })}
        </div>
      )}
    </AccordionSection>
  );
};

