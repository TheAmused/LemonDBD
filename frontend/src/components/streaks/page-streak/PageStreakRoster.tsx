// frontend/src/components/streaks/page-streak/PageStreakRoster.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { fetchRoster } from '@/services/pageStreakApi';
import { RosterEntry } from '@/types/pageStreak';
import { KillerRosterGrid } from './KillerRosterGrid';
import { useAuth } from '@/context/AuthContext';

interface PageStreakRosterProps {
  locale: string;
  dict?: any;
}

export const PageStreakRoster: React.FC<PageStreakRosterProps> = ({ locale, dict }) => {
  const { token } = useAuth();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setRoster(await fetchRoster(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the roster');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const pageCount = roster[0]?.page_count ?? 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] text-slate-500">
          {roster.length} {dict?.streaks?.killersYouOwn || 'killers you own'} {dict?.streaks?.middotSeparator || '·'} {pageCount} {dict?.streaks?.pagesCount || 'pages'}
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-300">
          <span>{error}</span>
          <button onClick={load} className="font-bold underline cursor-pointer">
            {dict?.streaks?.retry || 'Retry'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-slate-500">
          {dict?.streaks?.loadingRoster || 'Loading roster…'}
        </p>
      ) : (
        <KillerRosterGrid locale={locale} roster={roster} />
      )}
    </div>
  );
};
