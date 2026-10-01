'use client';
// frontend/src/components/streaks/PageStreakBoard.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
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
      <div className="mb-6 flex justify-end">
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
        confirmLabel={dict?.streaks?.resetConfirm || 'Reset'}
        cancelLabel={dict?.streaks?.cancel || 'Cancel'}
        busy={resettingAll}
        onConfirm={handleResetAll}
        onCancel={() => setConfirmingResetAll(false)}
      />

      <PageStreakRoster locale={locale} roster={roster} loading={loading} error={error} onRetry={load} dict={dict} />
    </div>
  );
};
