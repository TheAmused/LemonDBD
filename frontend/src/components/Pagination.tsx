'use client';
// frontend/src/components/Pagination.tsx

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PerkDictionary } from '@/types/perks';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  dict?: PerkDictionary;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalResults,
  limit,
  onPageChange,
  onLimitChange,
  dict,
}) => {
  const startIdx = totalResults === 0 ? 0 : (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, totalResults);
  const safeTotalPages = Math.max(1, totalPages || 1);

  // The page number that used to sit as plain text between the < and >
  // arrows now doubles as the "go to page" field itself -- typing a number
  // and pressing Enter (or tabbing away) jumps straight there. That removes
  // an entire separate input + label that duplicated the same job and, on
  // narrow screens, was the extra element that kept spilling onto its own
  // line by itself.
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

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
    dict?.pagination?.showing,
    `${startIdx}-${endIdx}`,
    dict?.pagination?.of,
    `${totalResults}`,
    dict?.pagination?.results,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav
      aria-label={dict?.pagination?.navAriaLabel}
      className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-2 w-full sm:mt-8 sm:justify-between sm:gap-x-4 sm:pt-4 lg:gap-x-5 lg:pt-5 wide:pt-6"
    >
      {/* Numbers only -- no "Showing"/"of"/"results" spelled out. Below
          400px there isn't room for this next to the page controls without
          crowding them, so it's visually hidden there too (sr-only keeps it
          in the accessibility tree either way -- nothing is lost for
          screen reader users, only sighted users on very small screens). */}
      <div
        className="sr-only min-[400px]:not-sr-only min-[400px]:text-[11px] min-[400px]:font-medium min-[400px]:text-text-muted sm:text-xs lg:text-sm wide:text-base"
        aria-live="polite"
        aria-label={showingAriaLabel || undefined}
      >
        <span className="font-bold text-text-primary">{startIdx}</span>
        <span className="mx-0.5" aria-hidden="true">-</span>
        <span className="font-bold text-text-primary">{endIdx}</span>
        <span className="mx-1.5 text-text-muted/60" aria-hidden="true">/</span>
        <span className="font-bold text-text-primary">{totalResults}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        <select
          id="limit-select"
          aria-label={dict?.pagination?.perPage || 'Per page'}
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded-lg border border-border-color bg-bg-surface px-1.5 py-1 text-[11px] font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-red cursor-pointer [&>option]:bg-bg-surface [&>option]:text-text-primary sm:px-2 sm:text-xs lg:px-3 lg:py-1.5 lg:text-sm wide:text-base"
        >
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={45}>45</option>
          <option value={60}>60</option>
        </select>

        <div className="flex items-center gap-1 lg:gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label={dict?.pagination?.firstPage}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10 wide:h-11 wide:w-11"
          >
            <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={dict?.pagination?.previous}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10 wide:h-11 wide:w-11"
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6" />
          </button>

          <span className="flex items-center gap-0.5 px-0.5 text-[11px] font-bold text-text-primary sm:gap-1 sm:text-xs lg:gap-1.5 lg:text-sm wide:text-base">
            <input
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
              aria-label={dict?.pagination?.goTo || 'Go to page'}
              className="w-7 [appearance:textfield] rounded-md border border-border-color bg-bg-surface px-1 py-0.5 text-center text-[11px] font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-red [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:w-9 sm:text-xs lg:w-11 lg:py-1 lg:text-sm wide:w-12"
            />
            <span aria-hidden="true" className="text-text-muted">/</span>
            <span aria-hidden="true">{safeTotalPages}</span>
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages}
            aria-label={dict?.pagination?.next}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10 wide:h-11 wide:w-11"
          >
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={page >= safeTotalPages}
            aria-label={dict?.pagination?.lastPage}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-secondary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed sm:h-8 sm:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10 wide:h-11 wide:w-11"
          >
            <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};
