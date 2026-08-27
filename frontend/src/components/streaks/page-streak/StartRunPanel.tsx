// frontend/src/components/streaks/page-streak/StartRunPanel.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchPoolSummary } from '@/services/pageStreakApi';
import { useAuth } from '@/context/AuthContext';

interface StartRunPanelProps {
  killer: string;
  busy: boolean;
  onStart: () => void;
  dict?: any;
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 dark:border-slate-800 dark:bg-slate-900/30 px-6 py-14 text-center shadow-sm">
      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
        Ready for {pageCount ?? '…'} pages on {killer}?
      </h3>
      <p className="max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        You start on page 1. A win moves you to the next page, a loss sends you back to the beginning. The page layout
        is frozen for the whole attempt.
      </p>
      <div className="flex flex-wrap justify-center gap-5 font-mono text-[11px] text-slate-500">
        <span>{dict?.streaks?.perksCount || 'perks'} <b className="text-slate-800 dark:text-slate-200 tabular-nums">{poolSize ?? '—'}</b></span>
        <span>{dict?.streaks?.pagesCount || 'pages'} <b className="text-slate-800 dark:text-slate-200 tabular-nums">{pageCount ?? '—'}</b></span>
        <span>{dict?.streaks?.lastPage || 'last page'} <b className="text-slate-800 dark:text-slate-200 tabular-nums">{lastPageSize ?? '—'}</b> {dict?.streaks?.perksCount || 'perks'}</span>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60 shadow-sm cursor-pointer"
      >
        {busy ? (dict?.streaks?.starting || 'Starting…') : (dict?.streaks?.startStreak || 'Start streak')}
      </button>
    </div>
  );
};
