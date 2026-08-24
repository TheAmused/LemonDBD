'use client';
// frontend/src/components/Pagination.tsx

import React, { useState } from 'react';
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

type PageToken = number | 'ellipsis';

function getPageTokens(current: number, total: number): PageToken[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [1];
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  if (rangeStart > 2) tokens.push('ellipsis');
  for (let i = rangeStart; i <= rangeEnd; i++) tokens.push(i);
  if (rangeEnd < total - 1) tokens.push('ellipsis');

  tokens.push(total);
  return tokens;
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
  const pageTokens = getPageTokens(page, safeTotalPages);

  const [jumpValue, setJumpValue] = useState('');

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

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
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

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed border border-slate-800"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={dict?.pagination?.previous || 'Previous Page'}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed border border-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageTokens.map((token, idx) =>
            token === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-500 select-none">
                &hellip;
              </span>
            ) : (
              <button
                key={token}
                type="button"
                onClick={() => onPageChange(token)}
                aria-current={token === page ? 'page' : undefined}
                className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-bold transition-colors cursor-pointer border ${
                  token === page
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                }`}
              >
                {token}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages}
            aria-label={dict?.pagination?.next || 'Next Page'}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed border border-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={page >= safeTotalPages}
            aria-label="Last Page"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed border border-slate-800"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        {safeTotalPages > 7 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <label htmlFor="jump-to-page" className="text-xs font-medium text-slate-400">
              Go to:
            </label>
            <input
              id="jump-to-page"
              type="number"
              min={1}
              max={safeTotalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder={`${page}`}
              className="w-14 rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 border border-slate-800"
            />
          </form>
        )}
      </div>
    </nav>
  );
};
