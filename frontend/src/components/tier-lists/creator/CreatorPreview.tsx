'use client';
// frontend/src/components/tier-lists/creator/CreatorPreview.tsx

import React, { useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import type { StoredCustomList, TierDefinition, TierListDocumentItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { documentItemsToItems } from '@/utils/tierLists/items';
import { TierBadge } from '../TierBadge';
import { CustomTierListCard } from '../TierListCards';
import { TierItemTile } from '../TierItemTile';
import { useDictionary } from "@/context/DictionaryContext";

interface CreatorPreviewProps {
  title: string;
  description?: string;
  tiers: TierDefinition[];
  items: TierListDocumentItem[];
  /** Sanitized, or null when unset/invalid -- already validated by the caller. */
  backgroundImage?: string | null;
  locale: string;
}

export function CreatorPreview({ title, description, tiers, items, backgroundImage, locale }: CreatorPreviewProps) {
  const dict = useDictionary();
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
        <span className="type-label-sm text-text-muted px-1 text-center">{c.cardPreviewHeading}</span>
        <div className="w-full max-w-sm">
          <CustomTierListCard list={cardPreviewList} locale={locale} disabled />
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
          <span className="type-label-sm text-text-muted">{t.unranked}</span>
          <span className="rounded-full bg-accent-red/10 px-2 py-0.5 type-strong-xs text-accent-red border border-accent-red/25">
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
}

export function CreatorPreviewModal({ isOpen, onClose, title, description, tiers, items, backgroundImage, locale }: CreatorPreviewModalProps) {
  const dict = useDictionary();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="5xl"
      title={dict.tierLists.creator.previewHeading}
      closeButtonAriaLabel={dict.characterDetail.close}
      bodyClassName="p-4 sm:p-6"
    >
      <CreatorPreview
        title={title}
        description={description}
        tiers={tiers}
        items={items}
        backgroundImage={backgroundImage}
        locale={locale}
      />
    </Modal>
  );
}
