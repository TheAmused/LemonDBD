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

  const [jumpValue, setJumpValue] = useState('');

  useEffect(() => {
    setJumpValue('');
  }, [page]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(jumpValue);
    if (Number.isInteger(target) && target >= 1 && target <= safeTotalPages) {
      onPageChange(target);
    }
    setJumpValue('');
  };

  return (
    <nav
      aria-label={dict?.pagination?.navAriaLabel}
      className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 w-full"
    >
      <div className="text-xs font-medium text-text-secondary" aria-live="polite">
        {dict?.pagination?.showing}{' '}
        <span className="font-bold text-text-primary">{startIdx}</span> -{' '}
        <span className="font-bold text-text-primary">{endIdx}</span>{' '}
        {dict?.pagination?.of}{' '}
        <span className="font-bold text-text-primary">{totalResults}</span>{' '}
        {dict?.pagination?.results}
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
        <div className="flex items-center gap-2">
          {dict?.pagination?.perPage && (
            <label htmlFor="limit-select" className="text-xs font-medium text-text-secondary">
              {dict.pagination.perPage}:
            </label>
          )}
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-border-color bg-bg-surface px-2.5 py-1 text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-amber cursor-pointer [&>option]:bg-bg-surface [&>option]:text-text-primary"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label={dict?.pagination?.firstPage}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={dict?.pagination?.previous}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="px-2 text-xs font-bold text-text-primary">
            {page} / {safeTotalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages}
            aria-label={dict?.pagination?.next}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={page >= safeTotalPages}
            aria-label={dict?.pagination?.lastPage}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-color bg-bg-surface text-text-primary hover:bg-bg-elevated disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        {safeTotalPages > 7 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            {dict?.pagination?.goTo && (
              <label htmlFor="jump-to-page" className="text-xs font-medium text-text-secondary">
                {dict.pagination.goTo}:
              </label>
            )}
            <input
              id="jump-to-page"
              type="number"
              min={1}
              max={safeTotalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder={`${page}`}
              className="w-9 [appearance:textfield] rounded-lg border border-border-color bg-bg-surface px-1.5 py-1 text-center text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-amber [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </form>
        )}
      </div>
    </nav>
  );
};

