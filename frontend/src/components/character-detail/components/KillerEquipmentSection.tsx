'use client';
// frontend/src/components/character-detail/components/KillerEquipmentSection.tsx
import React, { useMemo } from 'react';
import { Flame } from 'lucide-react';
import {
  AddonItem,
  EquipmentItem,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank,
} from '../types';
import { tip } from '@/components/common/Tooltip';
import { CollapsibleDrawer } from './CollapsibleDrawer';
import { toTitleCase } from '@/utils/textCase';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { IconTile } from '@/components/common/IconTile';
import { SectionHeading } from '@/components/common/SectionHeading';

interface KillerEquipmentSectionProps {
  addons?: (AddonItem | EquipmentItem)[];
  backendBase: string;
  onSelectEquipment: (item: AddonItem | EquipmentItem) => void;
  t: Record<string, string>;
}

export const KillerEquipmentSection: React.FC<KillerEquipmentSectionProps> = ({
  addons = [],
  backendBase,
  onSelectEquipment,
  t,
}) => {
  const [isDrawerOpen, , setDrawerOpen] = usePersistentDrawer('lemondbd_drawer_killer_addons', true);

  const sortedAddons = useMemo(() => {
    return [...addons].sort((a, b) => {
      const rankA = getRarityRank(a.rarity);
      const rankB = getRarityRank(b.rarity);
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [addons]);

  if (!addons || addons.length === 0) {
    return (
      <Surface as="section" padding="lg" className="mt-8 shadow-sm dark:shadow-none backdrop-blur-md">
        <div className="flex items-center gap-3 border-b border-border-color pb-4 mb-6">
          <IconTile tone="red" size="sm">
            <Flame className="h-5 w-5" />
          </IconTile>
          <div>
            <SectionHeading as="h3">
              {t.equipmentTitleKiller || 'Killer Power Add-ons & Equipment'}
            </SectionHeading>
          </div>
        </div>
        <div className="py-8 text-center text-xs text-text-muted">
          {t.noEquipment || 'No unique add-ons found for this character in database.'}
        </div>
      </Surface>
    );
  }

  return (
    <Surface as="section" padding="lg" className="mt-8 shadow-sm dark:shadow-none backdrop-blur-md">
      <CollapsibleDrawer
        open={isDrawerOpen}
        onOpenChange={setDrawerOpen}
        headerClassName="pb-4 mb-6 border-b border-border-color"
        header={
          <div className="flex items-center gap-3">
            <IconTile tone="red" size="sm">
              <Flame className="h-5 w-5" />
            </IconTile>
            <div>
              <SectionHeading as="h3">
                {t.equipmentTitleKiller || 'Killer Power Add-ons & Equipment'}
                <Badge tone="red" size="sm" plain>
                  {addons.length}
                </Badge>
              </SectionHeading>
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          {sortedAddons.map((item, idx) => {
            const iconSrc = getAssetUrl(backendBase, item.icon_local_path, item.icon_url);
            const rarityStyle = getRarityTileStyle(item.rarity);
            const displayItem = { ...item, name: toTitleCase(item.name) };

            return (
              <div
                key={`${item.name}-${idx}`}
                {...tip(displayItem.name, undefined, 'item')}
                onClick={() => onSelectEquipment(displayItem)}
                className={`relative group rounded-card border-2 p-2.5 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-red h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 shadow-lg ${rarityStyle.bg}`}
                style={rarityStyle.style}
              >
                <img
                  src={iconSrc}
                  alt={displayItem.name}
                  className="h-full w-full object-contain filter drop-shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            );
          })}
        </div>
      </CollapsibleDrawer>
    </Surface>
  );
};

