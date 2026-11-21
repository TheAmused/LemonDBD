'use client';
// frontend/src/components/tier-lists/TierPool.tsx

import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { ArrowDownToLine, ChevronDown, Maximize2, Minimize2, X } from 'lucide-react';
import type { TierItem } from '@/types/tierList';
import { cn } from '@/utils/cn';
import { normalizeSearchText } from '@/utils/perkUtils';
import { POOL_CONTAINER_ID } from '@/utils/tierLists/constants';
import { SortableTierItem } from './SortableTierItem';
import type { TierTileShape } from './TierItemTile';
import { containerDndId, itemDndId } from './dndIds';
import { SearchInput } from '@/components/common/Field';
import { EmptyState } from '@/components/common/EmptyState';
import { useDictionary } from "@/context/DictionaryContext";

import { Button } from '@/components/common/Button';
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
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
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
      collapsed,
      onCollapsedChange,
    }: TierPoolProps) {
  const dict = useDictionary();
  const t = dict.tierLists;
  const [query, setQuery] = useState<string>('');
  const [expanded, setExpanded] = useState<boolean>(false);
  const { setNodeRef, isOver } = useDroppable({ id: containerDndId(POOL_CONTAINER_ID) });
  const isHorizontalTray = !collapsed && !expanded;

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
  const handleItemSelect = React.useCallback(
    (key: string) => {
      if (canReceiveSelection) onMoveSelectedHere(POOL_CONTAINER_ID);
      else onSelect(key);
    },
    [canReceiveSelection, onMoveSelectedHere, onSelect]
  );

  return (
    <aside
      data-tier-pool=""
      data-sticky-tray={isHorizontalTray ? 'true' : 'false'}
      aria-label={t.unranked}
      className={cn(
        'group/tray sticky bottom-2 z-30 mt-auto w-full min-w-0 max-w-full flex flex-col overflow-hidden border border-border-color bg-bg-surface/95 backdrop-blur-xl shadow-2xl rounded-card transition-all',
        'shrink-0',
        'group-data-[fit-mode]/board:max-h-(--pool-max-total)'
      )}
    >
      {/* Header: search on the left (always reachable, even collapsed), title centred on the panel, collapse toggle on the right. */}
      {/* The whole bar toggles for pointer users; the chevron button is the keyboard control
          (role="presentation": the bar only catches its click as it bubbles). */}
      <div
        data-pool-head=""
        role="presentation"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-pool-search]')) return;
          onCollapsedChange(!collapsed);
        }}
        className="relative grid w-full cursor-pointer select-none grid-cols-pool-bar items-center gap-x-3 gap-y-1.5 overflow-hidden px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-4 sm:min-h-12 short:py-1 short:sm:min-h-0">
        {/* Atmospheric DBD Banner Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25 mix-blend-luminosity filter pointer-events-none"
          style={{ backgroundImage: "url('/images/banners/banner_loadouts.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface via-bg-surface/85 to-bg-surface pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-border-color/60 pointer-events-none" />

        <div
          data-pool-search=""
          className={cn(
            'relative z-10 col-span-3 row-start-2 cursor-auto sm:col-span-1 sm:col-start-1 sm:row-start-1 sm:max-w-xs',
            // Nothing to search in an empty pool, and keep collapsed bar slim unless filtering.
            ((keys.length === 0 && !query) || (collapsed && !query)) && 'hidden'
          )}
        >
          <SearchInput
            fieldSize="sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) onCollapsedChange(false);
            }}
            placeholder={t.searchPool}
            aria-label={t.searchPoolAria}
            className="h-8.5 bg-bg-primary pr-8 text-xs sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <Button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t.clearSearch}
              variant="ghost" size="xs" icon className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="relative z-10 col-start-2 row-start-1 flex items-center justify-center gap-2">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-text-primary">
            {t.unranked}
          </h2>
          <span className="rounded-chip bg-bg-elevated px-1.5 py-0.5 type-strong tabular-nums text-text-secondary">
            {keys.length}
          </span>
        </div>

        {/* Right controls: expand to multi-row sheet + collapse toggle */}
        <div className="relative z-10 col-start-3 row-start-1 justify-self-end flex items-center gap-0.5">
          <button
            type="button"
            data-testid="pool-expand-toggle"
            aria-pressed={expanded}
            aria-label={expanded ? t.hidePool : t.showPool}
            onClick={(e) => {
              e.stopPropagation();
              if (collapsed) {
                onCollapsedChange(false);
                setExpanded(true);
              } else {
                setExpanded((prev) => !prev);
              }
            }}
            className="flex min-h-10 min-w-10 items-center justify-center cursor-pointer select-none text-text-secondary hover:text-accent-amber transition-colors"
          >
            {expanded ? (
              <Minimize2 className="icon-sm sm:icon-md" aria-hidden="true" />
            ) : (
              <Maximize2 className="icon-sm sm:icon-md" aria-hidden="true" />
            )}
          </button>
          {/* No onClick of its own: the click bubbles to the header, which toggles (keyboard Enter/Space included). */}
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t.showPool : t.hidePool}
            className="flex min-h-10 min-w-10 items-center justify-center cursor-pointer select-none text-text-secondary hover:text-accent-red transition-colors"
          >
            <ChevronDown
              className={`icon-md sm:icon-lg text-accent-red transition-transform duration-300 ease-in-out ${
                collapsed ? 'rotate-0' : 'rotate-180'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      <div
        className={cn(
          'min-h-0 min-w-0 overflow-hidden flex-col',
          collapsed ? 'hidden' : 'flex flex-1'
        )}
      >
          {canReceiveSelection && (
            <div className="flex items-center justify-center border-t border-b border-border-color px-3 sm:px-4 py-2 bg-bg-surface/50">
              <Button
                type="button"
                onClick={() => onMoveSelectedHere(POOL_CONTAINER_ID)}
                variant="amberSoft" size="sm" dashed className="shrink-0"
              >
                <ArrowDownToLine aria-hidden="true" />
                {t.moveHere}
              </Button>
            </div>
          )}

          <div
            ref={setNodeRef}
            // A pointer shortcut for the "Move here" button above.
            role="presentation"
            onClick={canReceiveSelection ? () => onMoveSelectedHere(POOL_CONTAINER_ID) : undefined}
            className={cn(
              'w-full min-w-0 overscroll-contain transition-colors [scrollbar-width:thin]',
              expanded
                ? 'h-80 sm:h-96 overflow-y-auto p-3 sm:p-4'
                : 'overflow-x-auto overflow-y-hidden px-3 py-2 sm:px-4 touch-pan-x',
              'group-data-[fit]/board:p-(--tile-pad)!',
              'group-data-[fit-mode]/board:flex-1 group-data-[fit-mode]/board:overflow-y-auto group-data-[fit-mode]/board:overscroll-contain',
              isOver && 'bg-accent-red/10',
              canReceiveSelection && 'cursor-pointer hover:bg-accent-amber/5'
            )}
          >
          <div
            className={cn(
              'gap-1.5 sm:gap-2 group-data-[fit]/board:gap-(--tile-gap)!',
              expanded
                ? 'flex flex-wrap content-start justify-center'
                : cn(
                    'grid grid-flow-col auto-cols-max items-start justify-start w-max min-w-full',
                    visibleKeys.length <= 6 ? 'grid-rows-1' : 'grid-rows-2 lg:grid-rows-1'
                  )
            )}
          >
            <SortableContext
              items={visibleKeys.map(itemDndId)}
              strategy={expanded ? rectSortingStrategy : horizontalListSortingStrategy}
            >
              {visibleKeys.map((key) => {
                const item = itemsByKey.get(key);
                return item ? (
                  <SortableTierItem
                    key={key}
                    item={item}
                    shape={shape}
                    showName={showNames}
                    selected={selectedKey === key}
                    onSelect={handleItemSelect}
                    onPreview={onPreview}
                  />
                ) : null;
              })}
            </SortableContext>
          </div>
          {visibleKeys.length === 0 && (
            <EmptyState
              variant="inline"
              title={keys.length === 0 ? emptyLabel : t.poolNoMatches}
              className={expanded ? 'py-6 text-center' : 'py-2 text-center'}
            />
          )}
        </div>
      </div>
  </aside>
);
}
