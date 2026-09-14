'use client';
// frontend/src/components/streaks/PageStreakBoard.tsx
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PageStreakRoster } from './page-streak/PageStreakRoster';
import { fetchRoster, resetAllRuns } from '@/services/pageStreakApi';
import { RosterEntry } from '@/types/pageStreak';
import { useAuth } from '@/context/AuthContext';
import { useStreaksDict } from '@/context/StreaksDictContext';

interface PageStreakBoardProps {
  locale: string;
}

export const PageStreakBoard: React.FC<PageStreakBoardProps> = ({ locale }) => {
  const dict = useStreaksDict();
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
      const { roster: fetchedRoster } = await fetchRoster(token);
      setRoster(fetchedRoster);
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
      <Link
        href={`/${locale}/streaks/killer`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-text-secondary hover:text-accent-red transition-colors focus:outline-none focus:ring-2 focus:ring-accent-red"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{dict?.streaks?.backToKillerStreaks || 'Back to killer streaks'}</span>
      </Link>

      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/images/streaks/page-streak.jpg"
            alt=""
            className="h-11 w-11 rounded-xl border border-border-color object-cover shadow-sm"
          />
          <h2 className="text-lg font-extrabold tracking-wide text-text-primary">
            {dict?.streaks?.pageStreak || 'Page streak'}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setConfirmingResetAll(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated hover:bg-accent-red/10 text-text-secondary hover:text-accent-red border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
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

      <PageStreakRoster locale={locale} roster={roster} loading={loading} error={error} onRetry={load} dict={dict} />
    </div>
  );
};
