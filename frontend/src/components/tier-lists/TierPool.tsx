'use client';
// frontend/src/components/tier-lists/TierPool.tsx

import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { ArrowDownToLine, ChevronDown, LayoutList, Search, X } from 'lucide-react';
import type { TierItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { normalizeSearchText } from '@/utils/perkUtils';
import { POOL_CONTAINER_ID } from '@/utils/tierLists/constants';
import { SortableTierItem } from './SortableTierItem';
import type { TierTileShape } from './TierItemTile';
import { containerDndId, itemDndId } from './dndIds';

interface TierPoolProps {
  keys: string[];
  itemsByKey: ReadonlyMap<string, TierItem>;
  shape: TierTileShape;
  showNames: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onMoveSelectedHere: (containerId: string) => void;
  emptyLabel: string;
  dict: Dictionary;
}

/**
 * The unranked items. A bottom sheet pinned to the viewport on phones and
 * tablets, so any tier is reachable without dragging the length of the page;
 * a sticky side panel on desktop. Both scroll internally, and dnd-kit
 * auto-scrolls them while an item is dragged over their edges.
 */
export function TierPool({
  keys,
  itemsByKey,
  shape,
  showNames,
  selectedKey,
  onSelect,
  onMoveSelectedHere,
  emptyLabel,
  dict,
}: TierPoolProps) {
  const t = dict.tierLists;
  const [query, setQuery] = useState<string>('');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { setNodeRef, isOver } = useDroppable({ id: containerDndId(POOL_CONTAINER_ID) });

  const visibleKeys = useMemo(() => {
    const needle = normalizeSearchText(query);
    if (!needle) return keys;
    return keys.filter((key) => {
      const item = itemsByKey.get(key);
      return item
        ? normalizeSearchText(`${item.name} ${item.subtitle ?? ''}`).includes(needle)
        : false;
    });
  }, [keys, itemsByKey, query]);

  const canReceiveSelection = selectedKey !== null && !keys.includes(selectedKey);

  return (
    <aside
      data-tier-pool=""
      aria-label={t.unranked}
      className={cn(
        'w-full flex flex-col overflow-hidden border border-border-color bg-bg-surface shadow-xs rounded-3xl transition-all',
        'sticky bottom-0 z-20 -mx-3 w-[calc(100%+1.5rem)] sm:static sm:z-auto sm:mx-0 sm:w-full',
        'backdrop-blur-md bg-bg-surface/95 sm:bg-bg-surface sm:backdrop-blur-none sm:shadow-sm'
      )}
    >
      {/* Full-width Collapsible Drawer Banner Button */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t.showPool : t.hidePool}
        className="relative w-full flex items-center justify-between py-3 px-4 sm:py-3.5 sm:px-6 min-h-[56px] sm:min-h-[64px] cursor-pointer group select-none overflow-hidden transition-colors text-left"
      >
        {/* Atmospheric DBD Banner Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 mix-blend-luminosity filter pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out"
          style={{ backgroundImage: "url('/images/banners/banner_loadouts.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/85 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-accent-red/10 border border-accent-red/25 text-accent-red shrink-0">
            <LayoutList className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text-primary font-mono group-hover:text-accent-red transition-colors">
              {t.unranked}
            </h2>
            <span className="inline-flex items-center rounded-full bg-accent-red/10 px-2 py-0.5 text-[11px] font-bold text-accent-red border border-accent-red/25 font-mono">
              {t.unrankedCount.replace('{count}', String(keys.length))}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="text-xs text-text-secondary font-mono hidden sm:inline">
            {collapsed ? t.showPool : t.hidePool}
          </span>
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 text-accent-red transition-transform duration-300 ease-in-out ${
              collapsed ? 'rotate-0' : 'rotate-180'
            }`}
          />
        </div>
      </button>

      {/* Drawer Content */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          !collapsed ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden flex flex-col">
          {/* Unranked Pool Toolbar (Search + Selection Move) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-b border-border-color px-3 sm:px-4 py-2 bg-bg-surface/50">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPool}
                aria-label={t.searchPoolAria}
                className="h-8.5 w-full rounded-xl border border-border-color bg-bg-primary pl-9 pr-8 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-accent-red focus:outline-none transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={t.clearSearch}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {canReceiveSelection && (
              <button
                type="button"
                onClick={() => onMoveSelectedHere(POOL_CONTAINER_ID)}
                className="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-accent-amber/60 bg-accent-amber/10 px-3 text-xs font-bold text-accent-amber hover:bg-accent-amber/20 cursor-pointer transition-colors"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
                {t.moveHere}
              </button>
            )}
          </div>

          <div
            ref={setNodeRef}
            onClick={canReceiveSelection ? () => onMoveSelectedHere(POOL_CONTAINER_ID) : undefined}
            className={cn(
              'min-h-[100px] max-h-[45dvh] sm:max-h-[500px] flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 transition-colors',
              isOver && 'bg-accent-red/10',
              canReceiveSelection && 'cursor-pointer hover:bg-accent-amber/5'
            )}
          >
          <div className="flex flex-wrap content-start gap-1.5 sm:gap-2">
            <SortableContext items={visibleKeys.map(itemDndId)} strategy={rectSortingStrategy}>
              {visibleKeys.map((key) => {
                const item = itemsByKey.get(key);
                return item ? (
                  <SortableTierItem
                    key={key}
                    item={item}
                    shape={shape}
                    showName={showNames}
                    selected={selectedKey === key}
                    onSelect={onSelect}
                  />
                ) : null;
              })}
            </SortableContext>
          </div>
          {visibleKeys.length === 0 && (
            <p className="py-6 text-center text-xs font-semibold text-text-muted">
              {keys.length === 0 ? emptyLabel : t.poolNoMatches}
            </p>
          )}
        </div>
      </div>
    </div>
  </aside>
);
}
