'use client';
// frontend/src/components/tier-lists/creator/CreatorItems.tsx

import React, { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type { TierListDocumentItem } from '@/types/tierList';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';

import { TierItemEditModal } from './TierItemEditModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";
import { Img } from '@/components/common/Img';

interface CreatorItemsProps {
  items: TierListDocumentItem[];
  onRename: (id: string, name: string) => void;
  onUpdateItem?: (id: string, patch: { name: string; image?: string }) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

/** Crisp gaming tile grid with edge-to-edge images, seamless name caption, and click-to-edit modal. */
export function CreatorItems({ items, onRename, onUpdateItem, onRemove, onClear }: CreatorItemsProps) {
  const dict = useDictionary();
  const c = dict.tierLists.creator;
  const [editingItem, setEditingItem] = useState<TierListDocumentItem | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full sm:grid sm:grid-cols-[1fr_auto_1fr]">
        <div className="hidden sm:block pointer-events-none" aria-hidden="true" />
        <h3 className="text-center text-xs sm:text-sm font-black uppercase tracking-wider text-text-secondary">
          {formatMessage(c.itemsHeading, { count: items.length, max: TIER_LIST_LIMITS.maxItems })}
        </h3>
        <div className="flex justify-end">
          {items.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClear}
              leftIcon={<Trash2 className="h-3.5 w-3.5 text-accent-red" aria-hidden="true" />}
              className="min-h-9 shrink-0 whitespace-nowrap px-3 hover:border-accent-red/50 hover:text-accent-red"
            >
              {c.removeAll}
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState variant="compact" title={c.noItems} />
      ) : (
        <ul className="grid grid-cols-tiles-xs sm:grid-cols-tiles-sm md:grid-cols-tiles-md wide:grid-cols-tiles-lg wide-2k:grid-cols-tiles-xl gap-2 sm:gap-2.5 justify-center">
          {items.map((item) => (
            <li key={item.id} className="group/item relative flex flex-col items-center">
              {/* Crisp Square Tile Container */}
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-chip border border-border-color bg-bg-elevated transition-all duration-150 hover:border-accent-red/80 hover:shadow-md group-hover/item:border-accent-red/60 select-none">
                {/* Edge-to-edge tile image or dark initials placeholder */}
                {item.image ? (
                  <Img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover/item:scale-105"
                  />
                ) : (
                  <span className="text-base sm:text-lg font-black text-text-muted select-none">
                    {item.name.slice(0, 2).toUpperCase() || '?'}
                  </span>
                )}

                {/* Edit overlay button spanning the entire tile */}
                <button
                  type="button"
                  onClick={() => setEditingItem(item)}
                  aria-label={formatMessage(c.editItemAria, { name: item.name })}
                  className="absolute inset-0 z-0 flex items-center justify-center bg-bg-primary/50 opacity-0 group-hover/item:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-chip bg-bg-surface/90 text-accent-red shadow-sm border border-border-color/60">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="sr-only">{c.editItem}</span>
                </button>

                {/* Crisp top-right delete button */}
                <Button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={formatMessage(c.removeItemAria, { name: item.name })}
                  variant="overlay" size="xs" icon pill className="absolute top-1 right-1 z-10 opacity-80 sm:opacity-0 group-hover/item:opacity-100 hover:opacity-100"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>

              {/* Seamless Typography Caption / Inline Input */}
              <input
                value={item.name}
                maxLength={TIER_LIST_LIMITS.maxItemName}
                onChange={(e) => onRename(item.id, e.target.value)}
                aria-label={formatMessage(c.renameItemAria, { name: item.name })}
                className="mt-1 h-6 w-full rounded-chip border border-transparent bg-transparent px-1 text-center type-strong text-text-secondary transition-colors hover:text-text-primary hover:bg-bg-elevated/40 focus:border-accent-red focus:bg-bg-surface focus:text-text-primary focus:outline-hidden truncate"
              />
            </li>
          ))}
        </ul>
      )}

      {editingItem && (
        <TierItemEditModal
          key={editingItem.id}
          item={editingItem}
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSave={(id, patch) => {
            if (onUpdateItem) {
              onUpdateItem(id, patch);
            } else {
              onRename(id, patch.name);
            }
          }}
        />
      )}
    </div>
  );
}
