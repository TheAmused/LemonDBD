import React, { useState, useMemo } from 'react';
import { Flame } from 'lucide-react';
import {
  AddonItem,
  EquipmentItem,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank,
} from '../types';
import { UnifiedHoverModal, ActiveHoverState } from './UnifiedHoverModal';

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
  const [activeHover, setActiveHover] = useState<ActiveHoverState | null>(null);

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
      <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white font-mono flex items-center gap-2">
              {t.equipmentTitleKiller || 'Killer Power Add-ons & Equipment'}
            </h3>
            <p className="text-xs text-slate-400">
              {t.equipmentDescKiller || 'Explore specialized add-ons modifying this killer’s special power.'}
            </p>
          </div>
        </div>
        <div className="py-8 text-center text-xs text-slate-500 font-mono">
          {t.noEquipment || 'No unique add-ons found for this character in database.'}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white font-mono flex items-center gap-2">
              {t.equipmentTitleKiller || 'Killer Power Add-ons & Equipment'}
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                {addons.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {t.equipmentDescKiller || 'Explore specialized add-ons modifying this killer’s special power.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {sortedAddons.map((item, idx) => {
          const iconSrc = getAssetUrl(backendBase, item.icon_local_path, item.icon_url);
          const rarityStyle = getRarityTileStyle(item.rarity);

          return (
            <div
              key={`${item.name}-${idx}`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveHover({
                  item,
                  rect,
                  accentColor: 'text-rose-400',
                });
              }}
              onMouseLeave={() => setActiveHover(null)}
              onClick={() => onSelectEquipment(item)}
              className={`relative group rounded-3xl border-2 p-2.5 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 shadow-lg ${rarityStyle.bg}`}
            >
              <img
                src={iconSrc}
                alt={item.name}
                className="h-full w-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Unified Hover Modal */}
      <UnifiedHoverModal
        activeHover={activeHover}
        placement="above"
        t={t}
        actionPrompt={t.clickAddonForDetails || t.clickToInspect || 'Click add-on for details'}
      />
    </section>
  );
};

