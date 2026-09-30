'use client';
// frontend/src/components/tier-lists/creator/CreatorPreview.tsx

import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { StoredCustomList, TierDefinition, TierListDocumentItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { documentItemsToItems } from '@/utils/tierLists/items';
import { TierBadge } from '../TierBadge';
import { CustomTierListCard } from '../TierListCards';
import { TierItemTile } from '../TierItemTile';

interface CreatorPreviewProps {
  title: string;
  description?: string;
  tiers: TierDefinition[];
  items: TierListDocumentItem[];
  /** Sanitized, or null when unset/invalid -- already validated by the caller. */
  backgroundImage?: string | null;
  locale: string;
  dict: Dictionary;
}

export function CreatorPreview({ title, description, tiers, items, backgroundImage, locale, dict }: CreatorPreviewProps) {
  const t = dict.tierLists;
  const c = t.creator;
  const tiles = useMemo(() => documentItemsToItems(items), [items]);

  // A throwaway list shaped just enough for `CustomTierListCard` to render
  // -- same component the hub actually shows, in its `disabled` (no
  // navigation, no delete button) mode, so this preview can never drift
  // from what "My Custom Lists" really renders.
  const cardPreviewList: StoredCustomList = useMemo(
    () => ({
      id: 'preview',
      title,
      description: description ?? '',
      tiers,
      items,
      placements: {},
      createdAt: 0,
      updatedAt: 0,
      ...(backgroundImage ? { backgroundImage } : {}),
    }),
    [title, description, tiers, items, backgroundImage]
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col items-center gap-2 w-full">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted px-1 text-center">{c.cardPreviewHeading}</span>
        <div className="w-full max-w-sm">
          <CustomTierListCard list={cardPreviewList} locale={locale} dict={dict} disabled />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-2xl sm:text-3xl font-black text-text-primary break-words">
          {title.trim() || t.untitled}
        </h3>
        {description?.trim() && (
          <p className="mt-1 text-sm text-text-secondary max-w-xl mx-auto">{description.trim()}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="grid grid-cols-[4.75rem_minmax(0,1fr)] sm:max-wide-2k:grid-cols-[6.5rem_minmax(0,1fr)] wide-2k:grid-cols-[9rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border-color bg-bg-surface shadow-xs"
          >
            <TierBadge
              label={tier.label}
              color={tier.color}
              backgroundImage={tier.backgroundImage}
              className="flex min-h-[72px] sm:max-wide-2k:min-h-[84px] wide-2k:min-h-[112px] items-center justify-center p-2 text-center select-none"
              labelClassName="text-base sm:text-lg font-black leading-tight break-words [overflow-wrap:anywhere]"
            />
            <div className="bg-bg-primary/40 p-2 sm:p-2.5 flex flex-wrap items-center gap-2 min-h-[72px] sm:max-wide-2k:min-h-[84px] wide-2k:min-h-[112px]" />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-center gap-2 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">{t.unranked}</span>
          <span className="rounded-full bg-accent-red/10 px-2 py-0.5 text-[11px] font-bold text-accent-red border border-accent-red/25 font-mono">
            {tiles.length}
          </span>
        </div>
        <div className="w-full rounded-2xl border border-border-color bg-bg-primary/20 p-3 sm:p-4 min-h-[96px] flex flex-wrap gap-2 items-center justify-center">
          {tiles.length === 0 ? (
            <p className="text-xs text-text-muted italic px-2">{c.noItems}</p>
          ) : (
            tiles.map((item) => (
              <TierItemTile key={item.key} item={item} shape="square" showName={false} aria-hidden="true" className="cursor-default" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface CreatorPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  tiers: TierDefinition[];
  items: TierListDocumentItem[];
  backgroundImage?: string | null;
  locale: string;
  dict: Dictionary;
}

export function CreatorPreviewModal({
  isOpen,
  onClose,
  title,
  description,
  tiers,
  items,
  backgroundImage,
  locale,
  dict,
}: CreatorPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-bg-primary/50 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl border-2 border-accent-red/60 bg-bg-surface/95 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
      >
        <div className="flex items-center justify-between border-b border-border-color px-5 py-4 sm:px-6">
          <span className="text-xs font-black uppercase tracking-widest text-text-muted font-mono">
            {dict.tierLists.creator.previewHeading}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.characterDetail.close || 'Close'}
            className="p-1.5 rounded-xl border border-border-color bg-bg-elevated text-text-secondary hover:text-text-primary hover:bg-bg-elevated/80 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <CreatorPreview
            title={title}
            description={description}
            tiers={tiers}
            items={items}
            backgroundImage={backgroundImage}
            locale={locale}
            dict={dict}
          />
        </div>
      </div>
    </div>
  );
}
