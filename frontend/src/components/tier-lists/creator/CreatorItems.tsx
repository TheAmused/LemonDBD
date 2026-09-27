'use client';
// frontend/src/components/tier-lists/creator/CreatorItems.tsx

import React from 'react';
import { Trash2, X } from 'lucide-react';
import type { TierListDocumentItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { TIER_LIST_LIMITS } from '@/utils/tierLists/constants';
import { documentItemsToItems } from '@/utils/tierLists/items';
import { TierItemTile } from '../TierItemTile';
import { BTN_DANGER_GHOST } from '../styles';

interface CreatorItemsProps {
  items: TierListDocumentItem[];
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  dict: Dictionary;
}

/** Everything added so far: picture, editable name, remove. */
export function CreatorItems({ items, onRename, onRemove, onClear, dict }: CreatorItemsProps) {
  const c = dict.tierLists.creator;
  const tiles = documentItemsToItems(items);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-text-secondary">
          {c.itemsHeading.replace('{count}', String(items.length)).replace('{max}', String(TIER_LIST_LIMITS.maxItems))}
        </h3>
        {items.length > 0 && (
          <button type="button" onClick={onClear} className={BTN_DANGER_GHOST}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {c.removeAll}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-color p-6 text-center text-sm text-text-muted">{c.noItems}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
          {items.map((item, i) => (
            <li key={item.id} className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-border-color bg-bg-surface p-2">
              <TierItemTile item={tiles[i]} aria-hidden="true" className="cursor-default" />
              <input
                value={item.name}
                maxLength={TIER_LIST_LIMITS.maxItemName}
                onChange={(e) => onRename(item.id, e.target.value)}
                aria-label={c.renameItemAria.replace('{name}', item.name)}
                className="h-9 w-full rounded-lg border border-border-color bg-bg-primary px-2 text-center text-xs font-semibold text-text-primary focus:border-accent-red focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={c.removeItemAria.replace('{name}', item.name)}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-bg-surface/90 text-text-muted shadow-xs hover:bg-accent-red/10 hover:text-accent-red cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
