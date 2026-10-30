'use client';
// frontend/src/components/onboarding/wizard/ChapterToolbar.tsx
import React from 'react';
import { Check, Search, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { useDictionary } from '@/context/DictionaryContext';
import { InfoChip } from '@/components/common/InfoChip';
import { ToggleChip } from '@/components/common/ToggleChip';

interface ChapterToolbarProps {
  ownedChaptersCount: number;
  chapterCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAllOwned: boolean;
  hasAnySelection: boolean;
  onToggleAll: () => void;
  onDeselectAll: () => void;
}

/** Owned-chapter counter, chapter search, and the select-all / deselect-all controls. */
export function ChapterToolbar({
  ownedChaptersCount,
  chapterCount,
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5">
        <span className="type-label-sm text-text-secondary">
          {t.chaptersTitle}
        </span>
        <InfoChip>
          {ownedChaptersCount} / {chapterCount}
        </InfoChip>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-56">
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

        <div className="flex items-center gap-1.5 shrink-0">
          <ToggleChip pressed={isAllOwned} size="sm" onClick={onToggleAll}>
            {isAllOwned && <Check className="stroke-[3]" aria-hidden="true" />}
            <span>{t.selectAllButton}</span>
          </ToggleChip>

          <Button variant="secondary" size="sm" disabled={!hasAnySelection} onClick={onDeselectAll}>
            {t.deselectAllButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
