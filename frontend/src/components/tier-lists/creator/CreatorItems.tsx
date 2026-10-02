'use client';
// frontend/src/components/tier-lists/creator/CreatorItems.tsx

import React, { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type { TierListDocumentItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { TOUCH_BTN } from '../styles';
import { TierItemEditModal } from './TierItemEditModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';

interface CreatorItemsProps {
  items: TierListDocumentItem[];
  onRename: (id: string, name: string) => void;
  onUpdateItem?: (id: string, patch: { name: string; image?: string }) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  dict: Dictionary;
}

/** Crisp gaming tile grid with edge-to-edge images, seamless name caption, and click-to-edit modal. */
export function CreatorItems({ items, onRename, onUpdateItem, onRemove, onClear, dict }: CreatorItemsProps) {
  const c = dict.tierLists.creator;
  const [editingItem, setEditingItem] = useState<TierListDocumentItem | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="w-20 hidden sm:block pointer-events-none" aria-hidden="true" />
        <h3 className="flex-1 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-text-secondary">
          {c.itemsHeading.replace('{count}', String(items.length)).replace('{max}', String(TIER_LIST_LIMITS.maxItems))}
        </h3>
        <div className="w-20 flex justify-end">
          {items.length > 0 && (
            <Button variant="soft" onClick={onClear} className={TOUCH_BTN}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {c.removeAll}
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState variant="compact" title={c.noItems} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] wide:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] wide-2k:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2 sm:gap-2.5 justify-center">
          {items.map((item) => (
            <li key={item.id} className="group/item relative flex flex-col items-center">
              {/* Crisp Square Tile Container */}
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border-color bg-bg-elevated transition-all duration-150 hover:border-accent-red/80 hover:shadow-md group-hover/item:border-accent-red/60 select-none">
                {/* Edge-to-edge tile image or dark initials placeholder */}
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
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
                  aria-label={c.editItemAria.replace('{name}', item.name)}
                  className="absolute inset-0 z-0 flex items-center justify-center bg-bg-primary/50 opacity-0 group-hover/item:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-surface/90 text-accent-red shadow-sm border border-border-color/60">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="sr-only">{c.editItem}</span>
                </button>

                {/* Crisp top-right delete button */}
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={c.removeItemAria.replace('{name}', item.name)}
                  className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-bg-surface/90 text-text-muted opacity-80 sm:opacity-0 group-hover/item:opacity-100 hover:!opacity-100 hover:bg-accent-red hover:text-text-inverted transition-all shadow-xs cursor-pointer border border-border-color/40"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>

              {/* Seamless Typography Caption / Inline Input */}
              <input
                value={item.name}
                maxLength={TIER_LIST_LIMITS.maxItemName}
                onChange={(e) => onRename(item.id, e.target.value)}
                aria-label={c.renameItemAria.replace('{name}', item.name)}
                className="mt-1 h-6 w-full rounded-sm border border-transparent bg-transparent px-1 text-center type-strong text-text-secondary transition-colors hover:text-text-primary hover:bg-bg-elevated/40 focus:border-accent-red focus:bg-bg-surface focus:text-text-primary focus:outline-hidden truncate"
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
          dict={dict}
        />
      )}
    </div>
  );
}
