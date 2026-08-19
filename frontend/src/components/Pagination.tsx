'use client';
// frontend/src/components/Pagination.tsx

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  return (
    <nav
      aria-label="Pagination Navigation"
      className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 w-full"
    >
      <div className="text-xs font-medium text-slate-400" aria-live="polite">
        {dict?.pagination?.showing || 'Showing'}{' '}
        <span className="font-bold text-slate-100">{startIdx}</span> -{' '}
        <span className="font-bold text-slate-100">{endIdx}</span>{' '}
        {dict?.pagination?.of || 'of'}{' '}
        <span className="font-bold text-slate-100">{totalResults}</span>{' '}
        {dict?.pagination?.results || 'results'}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="limit-select" className="text-xs font-medium text-slate-400">
            {dict?.pagination?.perPage || 'Per page'}:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer border border-slate-800"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={dict?.pagination?.previous || 'Previous Page'}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed border border-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="px-2 text-xs font-bold text-slate-200">
            {page} / {safeTotalPages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages}
            aria-label={dict?.pagination?.next || 'Next Page'}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed border border-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};
