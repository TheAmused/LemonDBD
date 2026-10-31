'use client';
// frontend/src/components/common/Pagination.tsx

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { useDictionary } from "@/context/DictionaryContext";
import { cn } from '@/utils/cn';
import { Input } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { PAGE_SIZE_OPTIONS, pageRange } from '@/constants/pagination';
import { useOnValueChange } from '@/hooks/useOnValueChange';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  /** Omit for a fixed page size: the per-page picker is not shown. */
  onLimitChange?: (newLimit: number) => void;
  /** page: a footer below the page content (default). embedded: the last row of a panel, ruled off from the list above. compact: a footer with only < [page] / total >, the per-page picker and the range on the left. */
  variant?: 'page' | 'embedded' | 'compact';
  className?: string;
}

const NAV_VARIANTS = {
  page: 'mt-4 pt-2 sm:mt-8 sm:pt-4 lg:pt-5 wide:pt-6',
  compact: 'mt-4 pt-2 sm:mt-6 sm:pt-3',
  embedded: 'border-t border-border-color px-3 py-2.5 sm:px-4',
} as const;

// The arrow buttons and the per-page picker share one height.
const PAGE_CONTROL_HEIGHT = 'h-7 py-0 sm:h-8 lg:h-9 xl:h-10 wide:h-11';
// One look for the arrow buttons.
const PAGE_BUTTON =
  'pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-7 w-7 items-center justify-center rounded-control border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10 wide:h-11 wide:w-11';
const PAGE_ICON = 'h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6';

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, totalResults, limit, onPageChange, onLimitChange, variant = 'page', className }) => {
  const dict = useDictionary();
  const [startIdx, endIdx] = pageRange(page, limit, totalResults);
  const safeTotalPages = Math.max(1, totalPages || 1);

  const [pageInput, setPageInput] = useState(String(page));

  useOnValueChange(page, (next) => setPageInput(String(next)));

  const commitPageInput = () => {
    const target = Number(pageInput);
    if (Number.isInteger(target) && target >= 1 && target <= safeTotalPages && target !== page) {
      onPageChange(target);
    } else {
      setPageInput(String(page));
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  const showingAriaLabel = [
    dict.pagination.showing,
    `${startIdx}-${endIdx}`,
    dict.pagination.of,
    `${totalResults}`,
    dict.pagination.results,
  ]
    .filter(Boolean)
    .join(' ');

  const previousButton = (
    <button
      type="button"
      onClick={() => onPageChange(page - 1)}
      disabled={page <= 1}
      aria-label={dict.pagination.previous}
      className={PAGE_BUTTON}
    >
      <ChevronLeft className={PAGE_ICON} />
    </button>
  );
  const nextButton = (
    <button
      type="button"
      onClick={() => onPageChange(page + 1)}
      disabled={page >= safeTotalPages}
      aria-label={dict.pagination.next}
      className={PAGE_BUTTON}
    >
      <ChevronRight className={PAGE_ICON} />
    </button>
  );

  // The page you are on is the field itself: type a number and press Enter (or tab away) to jump there.
  const pageCounter = (
    <span className="flex items-center gap-0.5 px-0.5 text-mini font-bold text-text-primary sm:gap-1 sm:text-xs lg:gap-1.5 lg:text-sm wide:text-base">
      <Input
        id="current-page-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={safeTotalPages}
        value={pageInput}
        onChange={(e) => setPageInput(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commitPageInput}
        onKeyDown={handlePageInputKeyDown}
        aria-label={dict.pagination.goTo}
        fieldSize="xs"
        className="no-spinner w-7 px-1 text-center font-bold sm:w-9 sm:px-1 lg:w-11 lg:px-1 wide:w-12"
      />
      <span aria-hidden="true" className="text-text-muted">/</span>
      <span aria-hidden="true">{safeTotalPages}</span>
    </span>
  );

  const compact = variant === 'compact';
  // The site's dropdown, not a native select: same trigger and menu as every other picker.
  const limitSelect = onLimitChange && (
    <CustomDropdown<string>
      options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
      value={String(limit)}
      onChange={(next) => onLimitChange(Number(next))}
      ariaLabel={dict.pagination.perPage}
      accent="primary"
      align={compact ? 'left' : 'right'}
      minWidthClass="min-w-20"
      buttonClassName={PAGE_CONTROL_HEIGHT}
    />
  );
  // The compact pager puts the per-page picker on the left, next to the range.
  const picksLimitOnLeft = compact && Boolean(limitSelect);

  /* The range, numbers only ("1-15 / 176"): no "Showing"/"of"/"results" spelled out. Below 400px there isn't
     room for it next to the page controls, so it is visually hidden there (sr-only keeps it for screen readers). */
  const range = (
    <div
      className="sr-only phone:not-sr-only phone:text-mini phone:font-medium phone:text-text-muted sm:text-xs lg:text-sm wide:text-base"
      aria-live="polite"
      aria-label={showingAriaLabel || undefined}
    >
      <span className="font-bold text-text-primary">{startIdx}</span>
      <span className="mx-0.5" aria-hidden="true">-</span>
      <span className="font-bold text-text-primary">{endIdx}</span>
      <span className="mx-1.5 text-text-muted/60" aria-hidden="true">/</span>
      <span className="font-bold text-text-primary">{totalResults}</span>
    </div>
  );

  return (
    <nav
      aria-label={dict.pagination.navAriaLabel}
      className={cn(
        'flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-between sm:gap-x-4 lg:gap-x-5',
        NAV_VARIANTS[variant],
        className
      )}
    >
      {picksLimitOnLeft ? (
        <div className="flex items-center gap-2 lg:gap-3">
          {limitSelect}
          {range}
        </div>
      ) : (
        range
      )}

      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        {!picksLimitOnLeft && limitSelect}

        <div className="flex items-center gap-1 lg:gap-1.5">
          {!compact && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              aria-label={dict.pagination.firstPage}
              className={PAGE_BUTTON}
            >
              <ChevronsLeft className={PAGE_ICON} />
            </button>
          )}
          {previousButton}
          {pageCounter}
          {nextButton}
          {!compact && (
            <button
              type="button"
              onClick={() => onPageChange(safeTotalPages)}
              disabled={page >= safeTotalPages}
              aria-label={dict.pagination.lastPage}
              className={PAGE_BUTTON}
            >
              <ChevronsRight className={PAGE_ICON} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
