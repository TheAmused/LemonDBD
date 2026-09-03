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
  getLocalizedItemCategory,
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

  const maxAllowedWidth = Math.min(460, window.innerWidth - 24);
  const minIdealWidth = Math.min(270, window.innerWidth - 24);
  const tooltipWidth = Math.max(
    minIdealWidth,
    Math.min(
      maxAllowedWidth,
      descLen > 240 ? 440 : descLen > 120 ? 380 : descLen > 50 ? 320 : 270
    )
  );

  const tileCenter = rect.left + rect.width / 2;
  const left = Math.max(
    12,
    Math.min(window.innerWidth - tooltipWidth - 12, tileCenter - tooltipWidth / 2)
  );

  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  let showAbove = false;
  if (placement === 'above') {
    showAbove = spaceAbove >= 240 || spaceAbove >= spaceBelow;
  } else if (placement === 'below') {
    showAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
  } else {
    showAbove = spaceAbove >= 240 || spaceAbove >= spaceBelow;
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

  const charName = 'character' in item ? (item.character as string) : undefined;
  const isGeneric =
    !charName ||
    charName === 'General' ||
    ('is_generic_counterpart' in item && Boolean(item.is_generic_counterpart));
  const generalLabel = t.generalPerk || t.general;
  const aliasLabel = t.alias;
  const altName =
    'alternate_name' in item ? (item.alternate_name as string) : undefined;

  const isSurvivor =
    item.category === 'Survivor' ||
    ('role' in item && typeof item.role === 'string' && item.role.toLowerCase() === 'survivor');

  const perkBadgeText = isSurvivor ? t.survivorPerk : t.killerPerk;

  const badgeText =
    activeHover.badge ||
    (isPerkItem
      ? perkBadgeText
      : getLocalizedRarity(itemRarity, t) || itemRarity);

  const rawCategory =
    'category' in item && typeof item.category === 'string' ? item.category : undefined;
  const isRoleLeakingAsCategory =
    rawCategory === 'Survivor' || rawCategory === 'Killer' || /Offerings$/.test(rawCategory || '');

  const categoryText =
    activeHover.category ||
    (isPerkItem
      ? isGeneric
        ? generalLabel
        : charName || perkBadgeText
      : (isRoleLeakingAsCategory ? undefined : getLocalizedItemCategory(rawCategory, t)) ||
      t.equipment);

  const defaultAction =
    actionPrompt ||
    (isPerkItem
      ? t.clickToInspectPerk || t.clickToInspect
      : t.clickToInspect);

  return createPortal(
    <div
      style={positionStyles}
      className={`p-3.5 sm:p-4 rounded-2xl bg-bg-surface border ${
        isPerkItem ? 'border-accent-amber/50' : 'border-border-color'
      } text-text-primary shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 flex flex-col justify-between overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border-color pb-2.5 mb-2.5">
        <div className="min-w-0 flex-1">
          <h4
            className={`font-black text-xs sm:text-sm font-mono leading-tight truncate ${
              isPerkItem ? 'text-accent-amber' : 'text-text-primary'
            }`}
          >
            {item.name}
          </h4>
          {isPerkItem && (
            <p className="text-[11px] font-bold text-text-secondary mt-0.5 truncate">
              {isGeneric ? generalLabel : charName}
            </p>
          )}
        </div>

        {badgeText && (
          <span
            className={`flex items-center gap-1 text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
              isPerkItem
                ? isSurvivor
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/30'
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

      {item.description && (
        <div
          className="
            text-xs font-sans leading-relaxed overflow-y-auto pr-0.5 space-y-1.5
            text-text-primary

            [&_p]:text-text-primary
            [&_span]:text-text-primary
            [&_li]:text-text-primary

            [&_.text-white]:!text-text-primary dark:[&_.text-white]:!text-white
            [&_.text-slate-100]:!text-text-primary dark:[&_.text-slate-100]:!text-slate-100
            [&_.text-slate-200]:!text-text-primary dark:[&_.text-slate-200]:!text-slate-200
            [&_.text-slate-300]:!text-text-secondary dark:[&_.text-slate-300]:!text-slate-300
            [&_.text-slate-400]:!text-text-muted dark:[&_.text-slate-400]:!text-slate-400

            [&_strong]:!text-accent-amber [&_strong]:!font-bold
            [&_b]:!text-accent-amber [&_b]:!font-bold
            [&_.text-amber-400]:!text-accent-amber [&_.text-amber-400]:!font-bold
            [&_.text-amber-300]:!text-accent-amber [&_.text-amber-300]:!font-bold
            [&_.text-yellow-400]:!text-accent-amber [&_.text-yellow-400]:!font-bold
            [&_.text-yellow-300]:!text-accent-amber [&_.text-yellow-300]:!font-bold
            [&_.text-cyan-400]:!text-cyan-700 dark:[&_.text-cyan-400]:!text-cyan-400 [&_.text-cyan-400]:!font-bold
            [&_.text-cyan-300]:!text-cyan-700 dark:[&_.text-cyan-300]:!text-cyan-300 [&_.text-cyan-300]:!font-bold
            [&_.text-emerald-400]:!text-emerald-700 dark:[&_.text-emerald-400]:!text-emerald-400 [&_.text-emerald-400]:!font-bold
            [&_.text-rose-400]:!text-rose-700 dark:[&_.text-rose-400]:!text-rose-400 [&_.text-rose-400]:!font-bold
            [&_.text-red-400]:!text-rose-700 dark:[&_.text-red-400]:!text-red-400 [&_.text-red-400]:!font-bold

            [&_blockquote]:!bg-bg-elevated/80
            [&_blockquote]:!border-accent-amber/40
            [&_blockquote]:!text-text-secondary
            [&_blockquote_p]:!text-text-secondary
            [&_blockquote_span]:!text-text-secondary

            [&_[class*='bg-slate-9']]:!bg-bg-elevated/80
            [&_[class*='bg-slate-8']]:!bg-bg-elevated/80
            [&_[class*='bg-black']]:!bg-bg-elevated/80
            [&_[class*='bg-slate-9']_*]:!text-text-secondary
            [&_[class*='bg-slate-8']_*]:!text-text-secondary
            [&_[class*='bg-black']_*]:!text-text-secondary
          "
        >
          {renderFormattedDbdText(item.description, isPerkItem)}
        </div>
      )}

      {altName && aliasLabel && (
        <div className="mt-2 pt-2 border-t border-border-color flex items-center gap-1.5 text-[10px] text-accent-amber font-bold">
          <Repeat className="h-3 w-3 shrink-0" />
          <span>
            {aliasLabel}: {altName}
          </span>
        </div>
      )}

      <div className="pt-2 mt-2 border-t border-border-color text-[10px] font-mono text-text-muted flex items-center justify-between">
        <span className="truncate max-w-[50%]">{categoryText}</span>
        {defaultAction && (
          <span
            className={`font-bold shrink-0 ${accentColor ? accentColor : 'text-accent-amber'}`}
          >
            {defaultAction} →
          </span>
        )}
      </div>
    </div>,
    document.body
  );
};

