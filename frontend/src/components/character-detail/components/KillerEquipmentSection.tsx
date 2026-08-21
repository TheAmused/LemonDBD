import React, { useState, useMemo } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import {
  AddonItem,
  EquipmentItem,
  getAssetUrl,
  getRarityTileStyle,
  getRarityRank,
  renderFormattedDbdText,
} from '../types';

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
  const [activeHover, setActiveHover] = useState<{
    item: AddonItem | EquipmentItem;
    rect: DOMRect;
  } | null>(null);

  const sortedAddons = useMemo(() => {
    return [...addons].sort((a, b) => {
      const rankA = getRarityRank(a.rarity);
      const rankB = getRarityRank(b.rarity);
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });
  }, [addons]);

  if (!addons || addons.length === 0) return null;

  return (
    <section className="p-5 sm:p-6 rounded-3xl bg-slate-950/40 border border-slate-800/80 shadow-xl space-y-5 relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 font-mono tracking-tight flex items-center gap-2">
              {t.equipmentTitleKiller || 'Power Add-ons & Equipment'}
              <span className="text-sm font-bold text-rose-400 font-mono">({sortedAddons.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              {t.hoverToInspect || 'Hover over add-on icons for preview, click for full details.'}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-slate-400 hidden sm:flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Max 2 equipped in Trial
        </span>
      </div>

      {/* Responsive Add-ons Grid */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4.5 p-2">
        {sortedAddons.map((addon, idx) => {
          const id = `killer-addon-${addon.name}-${idx}`;
          const rarityStyle = getRarityTileStyle(addon.rarity);

          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectEquipment(addon)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectEquipment(addon);
                }
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveHover({ item: addon, rect });
              }}
              onMouseLeave={() => setActiveHover(null)}
              className={`relative group rounded-3xl border-2 p-2.5 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 shadow-lg ${rarityStyle.bg}`}
              aria-label={`Inspect addon: ${addon.name}`}
            >
              <img
                src={getAssetUrl(backendBase, addon.icon_local_path, addon.icon_url)}
                alt={addon.name}
                className="h-full w-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          );
        })}
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
            <span className="block text-[10px] font-mono text-rose-400 mt-2.5 text-right font-bold">
              {t.clickToInspect || 'Click to inspect full mechanics'} &rarr;
            </span>
          </div>
        );
      })()}
    </section>
  );
};

