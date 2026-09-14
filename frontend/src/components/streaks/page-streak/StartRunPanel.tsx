'use client';
// frontend/src/components/streaks/page-streak/StartRunPanel.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { fetchPoolSummary } from '@/services/pageStreakApi';
import { useAuth } from '@/context/AuthContext';

interface StartRunPanelProps {
  killer: string;
  busy: boolean;
  onStart: () => void;
  dict?: Dictionary;
}

export const StartRunPanel: React.FC<StartRunPanelProps> = ({ killer, busy, onStart, dict }) => {
  const { token } = useAuth();
  const [poolSize, setPoolSize] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [lastPageSize, setLastPageSize] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchPoolSummary(token)
      .then((data) => {
        if (cancelled) return;
        setPoolSize(data.pool_size);
        setPageCount(data.page_count);
        if (data.page_count > 0) {
          const perPage = data.perks_per_page;
          const remainder = data.pool_size % perPage;
          setLastPageSize(remainder === 0 ? perPage : remainder);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-color bg-bg-surface/60 px-6 py-14 text-center shadow-sm">
      <h3 className="text-base font-extrabold text-text-primary">
        {dict?.streaks?.readyForPrefix || 'Ready for'} {pageCount ?? '…'} {dict?.streaks?.pagesOnSuffix || 'pages on'} {killer}?
      </h3>
      <div className="flex flex-wrap justify-center gap-5 font-mono text-[11px] text-text-muted">
        <span>{dict?.streaks?.perksCount || 'perks'} <b className="text-text-primary tabular-nums">{poolSize ?? '—'}</b></span>
        <span>{dict?.streaks?.pagesCount || 'pages'} <b className="text-text-primary tabular-nums">{pageCount ?? '—'}</b></span>
        <span>{dict?.streaks?.lastPage || 'last page'} <b className="text-text-primary tabular-nums">{lastPageSize ?? '—'}</b> {dict?.streaks?.perksCount || 'perks'}</span>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="rounded-lg bg-accent-red hover:bg-accent-red-hover px-5 py-2.5 text-xs font-extrabold text-text-inverted disabled:opacity-60 shadow-sm cursor-pointer"
      >
        {busy ? (dict?.streaks?.starting || 'Starting…') : (dict?.streaks?.startStreak || 'Start streak')}
      </button>
    </div>
  );
};
