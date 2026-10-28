'use client';
// frontend/src/components/perks/PerkResultsCount.tsx
//
// The line above the perk grid: which perks of the matching ones this page shows ("Showing 1 to 15 of 176 perks").
import React from 'react';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { pageRange } from '@/constants/pagination';

interface PerkResultsCountProps {
  page: number;
  limit: number;
  totalResults: number;
}

const COUNT_CLASS = 'font-bold text-text-primary';

export const PerkResultsCount: React.FC<PerkResultsCountProps> = ({ page, limit, totalResults }) => {
  const dict = useDictionary();
  const locale = useLocale();
  const format = (n: number) => n.toLocaleString(locale);
  const [first, last] = pageRange(page, limit, totalResults);

  return (
    <p className="type-body-fluid tabular-nums text-text-muted" aria-live="polite">
      {dict.pagination.showing} <span className={COUNT_CLASS}>{format(first)}</span> {dict.pagination.to}{' '}
      <span className={COUNT_CLASS}>{format(last)}</span> {dict.pagination.of}{' '}
      <span className={COUNT_CLASS}>{format(totalResults)}</span> {dict.pagination.results}
    </p>
  );
};
