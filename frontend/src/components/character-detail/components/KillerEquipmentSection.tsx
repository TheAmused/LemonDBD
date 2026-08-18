import React, { useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { AddonItem, EquipmentItem, getAssetUrl, getRarityTileStyle, renderFormattedDbdText } from '../types';

interface KillerEquipmentSectionProps {
  addons?: (AddonItem | EquipmentItem)[];
  backendBase: string;
  onSelectEquipment: (item: AddonItem | EquipmentItem) => void;
  t: any;
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

  if (!addons || addons.length === 0) return null;

  return (
    <section className="p-6 rounded-3xl bg-slate-950/40 border border-slate-800/80 shadow-xl space-y-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/30">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-black text-slate-100 font-mono tracking-tight flex items-center gap-2">
              {t.killerPowerAddons || 'Killer Power Add-ons'}
              <span className="text-sm font-bold text-rose-400 font-mono">({addons.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              {t.hoverAddonPreview || 'Hover over add-on icons for preview, click for full details.'}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-slate-400 hidden sm:flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Max 2 equipped in Trial
        </span>
      </div>

      {/* Centered Bigger Add-ons Grid */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 sm:gap-4.5 p-2">
        {addons.map((addon, idx) => {
          const id = `killer-addon-${addon.name}-${idx}`;
          const rarityStyle = getRarityTileStyle(addon.rarity);

          return (
            <div
              key={id}
              onClick={() => onSelectEquipment(addon)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setActiveHover({ item: addon, rect });
              }}
              onMouseLeave={() => setActiveHover(null)}
              className={`relative group rounded-3xl border-2 p-2.5 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 shadow-lg ${rarityStyle.bg}`}
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

      {/* Viewport-Clamped Floating Tooltip (Bypasses parent clipping & sidebars) */}
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