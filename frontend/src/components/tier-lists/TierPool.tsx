'use client';
// frontend/src/components/tier-lists/TierPool.tsx

import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { ArrowDownToLine, ChevronDown, Search, X } from 'lucide-react';
import type { TierItem } from '@/types/tierList';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { normalizeSearchText } from '@/utils/perkUtils';
import { POOL_CONTAINER_ID } from '@/utils/tierLists/constants';
import { SortableTierItem } from './SortableTierItem';
import type { TierTileShape } from './TierItemTile';
import { containerDndId, itemDndId } from './dndIds';
import { Input } from '@/components/common/Field';
import { Badge } from '@/components/common/Badge';

interface TierPoolProps {
  keys: string[];
  itemsByKey: ReadonlyMap<string, TierItem>;
  shape: TierTileShape;
  showNames: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onPreview: (key: string) => void;
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
  onPreview,
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
        'shrink-0 bg-bg-surface/95 shadow-sm'
      )}
    >
      {/* Header: search on the left (always reachable, even collapsed), title centred on the panel, collapse toggle on the right. */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        className="relative grid w-full cursor-pointer select-none grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-3 gap-y-2 overflow-hidden px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-4 sm:min-h-[64px]">
        {/* Atmospheric DBD Banner Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 mix-blend-luminosity filter pointer-events-none"
          style={{ backgroundImage: "url('/images/banners/banner_loadouts.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/85 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 col-span-3 row-start-2 cursor-auto sm:col-span-1 sm:col-start-1 sm:row-start-1 sm:max-w-xs"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            type="search"
            fieldSize="sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setCollapsed(false);
            }}
            placeholder={t.searchPool}
            aria-label={t.searchPoolAria}
            className="h-8.5 rounded-xl bg-bg-primary pl-9 pr-8 text-xs sm:text-sm"
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

        <div className="relative z-10 col-start-2 row-start-1 flex items-center justify-center gap-2">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text-primary">
            {t.unranked}
          </h2>
          <Badge tone="red" plain className="type-strong-xs">
            {t.unrankedCount.replace('{count}', String(keys.length))}
          </Badge>
        </div>

        {/* No onClick of its own: the click bubbles to the header, which toggles (keyboard Enter/Space included). */}
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t.showPool : t.hidePool}
          className="relative z-10 col-start-3 row-start-1 justify-self-end flex min-h-[40px] items-center gap-2.5 cursor-pointer select-none text-text-secondary hover:text-accent-red transition-colors"
        >
          <span className="text-xs hidden sm:inline">{collapsed ? t.showPool : t.hidePool}</span>
          <ChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 text-accent-red transition-transform duration-300 ease-in-out ${
              collapsed ? 'rotate-0' : 'rotate-180'
            }`}
          />
        </button>
      </div>

      {/* Drawer Content */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          !collapsed ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden flex flex-col">
          {canReceiveSelection && (
            <div className="flex items-center justify-center border-t border-b border-border-color px-3 sm:px-4 py-2 bg-bg-surface/50">
              <button
                type="button"
                onClick={() => onMoveSelectedHere(POOL_CONTAINER_ID)}
                className="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-accent-amber/60 bg-accent-amber/10 px-3 type-strong text-accent-amber hover:bg-accent-amber/20 cursor-pointer transition-colors"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
                {t.moveHere}
              </button>
            </div>
          )}

          <div
            ref={setNodeRef}
            onClick={canReceiveSelection ? () => onMoveSelectedHere(POOL_CONTAINER_ID) : undefined}
            className={cn(
              'min-h-[100px] max-h-[calc(var(--pool-h)-var(--pool-head))] flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 transition-colors',
              isOver && 'bg-accent-red/10',
              canReceiveSelection && 'cursor-pointer hover:bg-accent-amber/5'
            )}
          >
          <div className="flex flex-wrap content-start justify-center gap-1 min-[480px]:gap-1.5 sm:gap-2">
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
                    onPreview={onPreview}
                  />
                ) : null;
              })}
            </SortableContext>
          </div>
          {visibleKeys.length === 0 && (
            <p className="py-6 text-center type-strong text-text-muted">
              {keys.length === 0 ? emptyLabel : t.poolNoMatches}
            </p>
          )}
        </div>
      </div>
    </div>
  </aside>
);
}
