'use client';
// frontend/src/components/common/Pagination.tsx

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { useDictionary } from "@/context/DictionaryContext";
import { cn } from '@/utils/cn';
import { Input, Select } from '@/components/common/Field';
import { PAGE_SIZE_OPTIONS, pageRange, pageWindow } from '@/constants/pagination';
import { useOnValueChange } from '@/hooks/useOnValueChange';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  /** Omit for a fixed page size: the per-page picker is not shown. */
  onLimitChange?: (newLimit: number) => void;
  /** page: a footer below the page content (default). embedded: the last row of a panel, ruled off from the list above. numbered: a footer with page number buttons instead of the page field. */
  variant?: 'page' | 'embedded' | 'numbered';
  className?: string;
}

const NAV_VARIANTS = {
  page: 'mt-4 pt-2 sm:mt-8 sm:pt-4 lg:pt-5 wide:pt-6',
  numbered: 'mt-4 pt-2 sm:mt-6 sm:pt-3',
  embedded: 'border-t border-border-color px-3 py-2.5 sm:px-4',
} as const;

// One look for the four arrow buttons.
const PAGE_BUTTON =
  'pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex h-7 w-7 items-center justify-center rounded-control border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10 wide:h-11 wide:w-11';
const PAGE_ICON = 'h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6';
// The page you are on, in the numbered pager.
const PAGE_BUTTON_CURRENT = 'border-accent-red bg-accent-red text-text-inverted hover:bg-accent-red';

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, totalResults, limit, onPageChange, onLimitChange, variant = 'page', className }) => {
  const dict = useDictionary();
  const [startIdx, endIdx] = pageRange(page, limit, totalResults);
  const safeTotalPages = Math.max(1, totalPages || 1);

  // The page number that used to sit as plain text between the < and >
  // arrows now doubles as the "go to page" field itself -- typing a number
  // and pressing Enter (or tabbing away) jumps straight there. That removes
  // an entire separate input + label that duplicated the same job and, on
  // narrow screens, was the extra element that kept spilling onto its own
  // line by itself.
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

  const limitSelect = onLimitChange && (
    <Select
      id="limit-select"
      aria-label={dict.pagination.perPage}
      fieldSize="xs"
      value={limit}
      onChange={(e) => onLimitChange(Number(e.target.value))}
      className="w-auto font-semibold"
    >
      {PAGE_SIZE_OPTIONS.map((size) => (
        <option key={size} value={size}>{size}</option>
      ))}
    </Select>
  );
  // The numbered pager has no use for the range: the per-page picker takes its place on the left.
  const picksLimitOnLeft = variant === 'numbered' && Boolean(limitSelect);

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
        limitSelect
      ) : (
        /* Numbers only -- no "Showing"/"of"/"results" spelled out. Below
           400px there isn't room for this next to the page controls without
           crowding them, so it's visually hidden there too (sr-only keeps it
           in the accessibility tree either way -- nothing is lost for
           screen reader users, only sighted users on very small screens). */
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
      )}

      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        {!picksLimitOnLeft && limitSelect}

        {variant === 'numbered' ? (
          <div className="flex items-center gap-1 lg:gap-1.5">
            {previousButton}
            {pageWindow(page, safeTotalPages).map((item, i) =>
              item === 'gap' ? (
                <span key={`gap-${i}`} aria-hidden="true" className="px-0.5 text-text-muted">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? 'page' : undefined}
                  aria-label={`${dict.pagination.page} ${item}`}
                  className={cn(PAGE_BUTTON, 'text-mini font-bold sm:text-xs lg:text-sm', item === page && PAGE_BUTTON_CURRENT)}
                >
                  {item}
                </button>
              )
            )}
            {nextButton}
          </div>
        ) : (
          <div className="flex items-center gap-1 lg:gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              aria-label={dict.pagination.firstPage}
              className={PAGE_BUTTON}
            >
              <ChevronsLeft className={PAGE_ICON} />
            </button>
            {previousButton}

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

            {nextButton}
            <button
              type="button"
              onClick={() => onPageChange(safeTotalPages)}
              disabled={page >= safeTotalPages}
              aria-label={dict.pagination.lastPage}
              className={PAGE_BUTTON}
            >
              <ChevronsRight className={PAGE_ICON} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
