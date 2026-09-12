'use client';
// frontend/src/components/streaks/page-streak/PageStreakRoster.tsx
import type { Dictionary } from '@/locales/types';

import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { fetchRoster, resetAllRuns } from '@/services/pageStreakApi';
import { RosterEntry } from '@/types/pageStreak';
import { KillerRosterGrid } from './KillerRosterGrid';
import { useAuth } from '@/context/AuthContext';

interface PageStreakRosterProps {
  locale: string;
  dict?: Dictionary;
}

export const PageStreakRoster: React.FC<PageStreakRosterProps> = ({ locale, dict }) => {
  const { token } = useAuth();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingResetAll, setConfirmingResetAll] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

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

  const handleResetAll = async () => {
    if (!token) return;
    setResettingAll(true);
    try {
      await resetAllRuns(token);
      setConfirmingResetAll(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the roster');
    } finally {
      setResettingAll(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setConfirmingResetAll(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {dict?.streaks?.resetAllRuns || 'Reset all killers'}
        </button>
      </div>

      <ConfirmModal
        open={confirmingResetAll}
        title={dict?.streaks?.resetAllRunsTitle || 'Are you sure you want to start over?'}
        message={
          dict?.streaks?.resetAllRunsPrompt ||
          'This resets progress on every killer and clears every Page Streak win. This cannot be undone.'
        }
        confirmLabel={dict?.generator?.resetAllLabel || 'Reset All'}
        cancelLabel={dict?.streaks?.cancel || 'Cancel'}
        busy={resettingAll}
        onConfirm={handleResetAll}
        onCancel={() => setConfirmingResetAll(false)}
      />

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
        <KillerRosterGrid locale={locale} roster={roster} dict={dict} />
      )}
    </div>
  );
};
