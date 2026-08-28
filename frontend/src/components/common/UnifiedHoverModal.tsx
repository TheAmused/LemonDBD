'use client';
// frontend/src/components/common/UnifiedHoverModal.tsx

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Skull, Repeat } from 'lucide-react';
import {
  PerkItem,
  AddonItem,
  EquipmentItem,
  OfferingItem,
  getRarityTileStyle,
  getLocalizedRarity,
  renderFormattedDbdText,
} from '@/components/character-detail/types';
import { Perk } from '@/types/perks';

export type HoverPlacement = 'above' | 'below' | 'auto';

export type UnifiedHoverItem =
  | Perk
  | PerkItem
  | AddonItem
  | EquipmentItem
  | OfferingItem
  | {
      name: string;
      description?: string;
      rarity?: string;
      category?: string;
      role?: string;
      character?: string;
      character_real_name?: string;
      alternate_name?: string;
      is_generic_counterpart?: boolean;
      is_disabled?: boolean;
      [key: string]: unknown;
    };

export interface ActiveHoverState {
  item: UnifiedHoverItem;
  rect: DOMRect;
  badge?: string;
  category?: string;
  accentColor?: string;
}

export interface UnifiedHoverModalProps {
  activeHover: ActiveHoverState | null;
  placement?: HoverPlacement;
  t?: Record<string, string>;
  actionPrompt?: string;
  isPerk?: boolean;
}

export const UnifiedHoverModal: React.FC<UnifiedHoverModalProps> = ({
  activeHover,
  placement = 'auto',
  t = {},
  actionPrompt,
  isPerk = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!activeHover || !mounted || typeof document === 'undefined') {
    return null;
  }

  const { item, rect, accentColor } = activeHover;
  const rawDesc = item.description || '';
  const descLen = rawDesc.length;

  // Responsive dynamic width based on content length
  const maxAllowedWidth = Math.min(460, window.innerWidth - 24);
  const minIdealWidth = Math.min(270, window.innerWidth - 24);
  const tooltipWidth = Math.max(
    minIdealWidth,
    Math.min(
      maxAllowedWidth,
      descLen > 240 ? 440 : descLen > 120 ? 380 : descLen > 50 ? 320 : 270
    )
  );

  // Horizontal position centered over tile with 12px viewport safe margin
  const tileCenter = rect.left + rect.width / 2;
  const left = Math.max(
    12,
    Math.min(window.innerWidth - tooltipWidth - 12, tileCenter - tooltipWidth / 2)
  );

  // Determine vertical placement (above vs below)
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  let showAbove = false;
  if (placement === 'above') {
    // Prefer above if there is adequate room (~260px) or more room above than below
    showAbove = spaceAbove >= 260 || (spaceAbove >= spaceBelow && spaceAbove >= 160);
  } else if (placement === 'below') {
    // Prefer below unless overflowing viewport bottom and more space above
    showAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
  } else {
    // Auto: pick above if enough space, otherwise below
    showAbove = spaceAbove >= spaceBelow && spaceAbove >= 240;
  }

  const positionStyles: React.CSSProperties = showAbove
    ? {
        position: 'fixed',
        bottom: `${Math.max(12, window.innerHeight - rect.top + 10)}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        maxHeight: `${Math.min(window.innerHeight - 24, Math.max(180, rect.top - 20))}px`,
        zIndex: 99999,
      }
    : {
        position: 'fixed',
        top: `${Math.max(12, rect.bottom + 10)}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        maxHeight: `${Math.min(window.innerHeight - rect.bottom - 20, window.innerHeight - 24)}px`,
        zIndex: 99999,
      };

  const isPerkItem = isPerk || 'character' in item;

  const itemRarity =
    'rarity' in item && typeof item.rarity === 'string' ? item.rarity : undefined;
  const rarityStyle = getRarityTileStyle(itemRarity);

  // Character info for perks
  const charName = 'character' in item ? (item.character as string) : undefined;
  const charRealName =
    'character_real_name' in item
      ? (item.character_real_name as string)
      : undefined;
  const isGeneric =
    !charName ||
    charName === 'General' ||
    ('is_generic_counterpart' in item && Boolean(item.is_generic_counterpart));
  const generalLabel = t.generalPerk || t.general || 'General Perk';
  const aliasLabel = t.alias || 'Alias';
  const altName =
    'alternate_name' in item ? (item.alternate_name as string) : undefined;

  const isSurvivor =
    item.category === 'Survivor' ||
    ('role' in item && typeof item.role === 'string' && item.role.toLowerCase() === 'survivor');

  const perkBadgeText = isSurvivor
    ? t.survivorPerk || 'Survivor Perk'
    : t.killerPerk || 'Killer Perk';

  const badgeText =
    activeHover.badge ||
    (isPerkItem
      ? perkBadgeText
      : getLocalizedRarity(itemRarity, t) || itemRarity);

  const rawCategory = 'category' in item && typeof item.category === 'string' ? item.category : undefined;
  const isRoleLeakingAsCategory = rawCategory === 'Survivor' || rawCategory === 'Killer';

  const categoryText =
    activeHover.category ||
    (isPerkItem
      ? isGeneric
        ? generalLabel
        : charName || perkBadgeText
      : (isRoleLeakingAsCategory ? undefined : rawCategory) || t.equipment || 'Equipment');

  const defaultAction =
    actionPrompt ||
    (isPerkItem
      ? t.clickToInspectPerk || t.clickToInspect || 'Click to inspect perk'
      : t.clickToInspect || 'Click to inspect full mechanics');

  return createPortal(
    <div
      style={positionStyles}
      className={`p-3.5 sm:p-4 rounded-2xl bg-slate-950/95 border ${
        isPerkItem ? 'border-amber-500/40' : 'border-slate-700/80'
      } text-slate-100 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 flex flex-col justify-between overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-2.5">
        <div className="min-w-0 flex-1">
          <h4
            className={`font-black text-xs sm:text-sm font-mono leading-tight truncate ${
              isPerkItem ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            {item.name}
          </h4>
          {isPerkItem && (
            <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
              {isGeneric ? generalLabel : charName}
              {charRealName && charRealName !== charName && (
                <span className="text-[10px] font-normal text-slate-500 ml-1">
                  ({charRealName})
                </span>
              )}
            </p>
          )}
        </div>

        {badgeText && (
          <span
            className={`flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
              isPerkItem
                ? isSurvivor
                  ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-950/90 text-rose-400 border-rose-500/30'
                : rarityStyle.badge
            }`}
          >
            {isPerkItem &&
              (isSurvivor ? (
                <Shield className="h-2.5 w-2.5" />
              ) : (
                <Skull className="h-2.5 w-2.5" />
              ))}
            {badgeText}
          </span>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <div className="text-xs sm:text-xs text-slate-200 leading-relaxed font-sans overflow-y-auto pr-0.5 space-y-1">
          {renderFormattedDbdText(item.description, isPerkItem)}
        </div>
      )}

      {/* Alias / Alternate name if present */}
      {altName && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
          <Repeat className="h-3 w-3 shrink-0" />
          <span>
            {aliasLabel}: {altName}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 mt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center justify-between">
        <span className="truncate max-w-[50%]">{categoryText}</span>
        <span
          className={`font-bold shrink-0 ${
            accentColor ? accentColor : 'text-amber-400'
          }`}
        >
          {defaultAction} {'→'}
        </span>
      </div>
    </div>,
    document.body
  );
};
