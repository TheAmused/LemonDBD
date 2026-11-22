'use client';
// frontend/src/components/onboarding/wizard/ChapterToolbar.tsx
import React from 'react';
import { Check, Eraser, Search, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';
import { Input } from '@/components/common/Field';
import { useDictionary } from '@/context/DictionaryContext';
import { ToggleChip } from '@/components/common/ToggleChip';

interface ChapterToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAllOwned: boolean;
  hasAnySelection: boolean;
  onToggleAll: () => void;
  onDeselectAll: () => void;
}

/** Chapter search and the select-all / deselect-all controls. */
export function ChapterToolbar({
  searchQuery,
  setSearchQuery,
  isAllOwned,
  hasAnySelection,
  onToggleAll,
  onDeselectAll,
}: ChapterToolbarProps) {
  const dict = useDictionary();
  const t = dict.onboarding;

  return (
    // Phones: a header row (label, Clear) over a controls row (search, select all). From `sm` up it is one
    // row: label on the left, then search, select all, the clear icon. `order-*` places each child for both layouts.
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex">
      <span className="order-1 type-label-sm text-text-secondary sm:mr-auto">
        {t.chaptersTitle}
      </span>

      <Button
        variant="secondary" size="sm" icon className="order-2 sm:order-4"
        aria-label={t.deselectAllButton} {...tip(t.deselectAllButton, undefined, 'action')}
        disabled={!hasAnySelection} onClick={onDeselectAll}
      >
        <Eraser />
      </Button>

      <div className="relative order-3 min-w-0 sm:order-2 sm:w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 icon-sm text-text-muted" />
        <Input
          type="text"
          fieldSize="sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="pl-8 pr-7"
        />
        {searchQuery && (
          <Button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label={dict.filters.clearSearch}
            variant="ghost" size="xs" icon className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X />
          </Button>
        )}
      </div>

      <ToggleChip pressed={isAllOwned} size="sm" className="order-4 sm:order-3" onClick={onToggleAll}>
        {isAllOwned && <Check className="stroke-[3]" aria-hidden="true" />}
        <span>{t.selectAllButton}</span>
      </ToggleChip>
    </div>
  );
}
