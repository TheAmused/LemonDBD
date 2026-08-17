'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  dict: any;
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

  return (
    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/80 pt-6 dark:border-slate-800/80">
      {/* Results Readout */}
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
        {dict.pagination.showing} <span className="font-bold text-slate-900 dark:text-slate-100">{startIdx}</span> -{' '}
        <span className="font-bold text-slate-900 dark:text-slate-100">{endIdx}</span> {dict.pagination.of}{' '}
        <span className="font-bold text-slate-900 dark:text-slate-100">{totalResults}</span> {dict.pagination.results}
      </div>

      {/* Control Buttons & Limit Selector */}
      <div className="flex items-center justify-between sm:justify-end gap-3">
        {/* Limit Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {dict.pagination.perPage}:
          </span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-red-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};