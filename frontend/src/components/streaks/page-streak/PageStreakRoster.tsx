'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { fetchExcludedPerks, fetchRoster } from '@/services/pageStreakApi';
import { RosterEntry } from '@/types/pageStreak';
import { KillerRosterGrid } from './KillerRosterGrid';
import { ExcludedPerksModal } from './ExcludedPerksModal';

interface PageStreakRosterProps {
  locale: string;
}

export const PageStreakRoster: React.FC<PageStreakRosterProps> = ({ locale }) => {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [poolSize, setPoolSize] = useState(0);
  const [excludedCount, setExcludedCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rosterData, exclusions] = await Promise.all([fetchRoster(), fetchExcludedPerks()]);
      setRoster(rosterData);
      setPoolSize(exclusions.pool_size);
      setExcludedCount(exclusions.excluded.length);
      setPageCount(exclusions.page_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the roster');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Perks I don&apos;t own ({excludedCount})
        </button>
        <span className="font-mono text-[11px] text-slate-500">
          {poolSize} perks · {pageCount} pages
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-300">
          <span>{error}</span>
          <button onClick={load} className="font-bold underline">Retry</button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-slate-500">Loading roster…</p>
      ) : (
        <KillerRosterGrid locale={locale} roster={roster} />
      )}

      <ExcludedPerksModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
    </div>
  );
};
