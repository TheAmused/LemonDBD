'use client';
// frontend/src/components/onboarding/wizard/ChapterToolbar.tsx
import React from 'react';
import { Check, Search, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { useDictionary } from '@/context/DictionaryContext';

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
        <span className="rounded-full border border-border-color bg-bg-elevated px-2 py-0.5 type-strong-xs text-text-secondary">
          {ownedChaptersCount} / {chapterCount}
        </span>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <Input
            type="text"
            fieldSize="sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="pl-8 pr-7"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={dict.filters.clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={isAllOwned}
            onClick={onToggleAll}
            className={`group relative flex items-center gap-2 rounded-lg border px-2.5 sm:px-3 py-1.5 transition-all select-none cursor-pointer ${
              isAllOwned
                ? 'border-accent-red/80 bg-accent-red/15 text-accent-red'
                : 'border-border-color bg-bg-surface text-text-secondary hover:border-accent-red/60 hover:text-text-primary'
            }`}
          >
            <span
              aria-hidden="true"
              className={`relative flex h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 items-center justify-center rounded-[3px] border transition-all duration-150 ${
                isAllOwned
                  ? 'border-accent-red bg-accent-red text-text-inverted'
                  : 'border-border-color/80 bg-bg-elevated/80 group-hover:border-accent-red/80'
              }`}
            >
              {isAllOwned && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />}
            </span>
            <span className="text-xs font-bold tracking-tight">
              {t.selectAllButton}
            </span>
          </button>

          <Button variant="secondary" size="sm" disabled={!hasAnySelection} onClick={onDeselectAll}>
            {t.deselectAllButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
