'use client';
// frontend/src/components/streaks/PageStreakBoard.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { PageStreakRoster } from './page-streak/PageStreakRoster';
import { fetchRoster, resetAllRuns } from '@/services/pageStreakApi';
import { RosterEntry } from '@/types/pageStreak';
import { useAuth } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';

interface PageStreakBoardProps {
  locale: string;
}

export const PageStreakBoard: React.FC<PageStreakBoardProps> = ({ locale }) => {
  const dict = useDictionary();
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated hover:bg-accent-red/10 text-text-secondary hover:text-accent-red border border-border-color type-strong transition-colors shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {dict.streaks.resetAllRuns}
        </button>
      </div>

      <ConfirmModal
        open={confirmingResetAll}
        title={dict.streaks.resetAllRunsTitle}
        message={
          dict.streaks.resetAllRunsPrompt
        }
        confirmLabel={dict.streaks.resetConfirm}
        cancelLabel={dict.streaks.cancel}
        busy={resettingAll}
        onConfirm={handleResetAll}
        onCancel={() => setConfirmingResetAll(false)}
      />

      <PageStreakRoster locale={locale} roster={roster} loading={loading} error={error} onRetry={load} />
    </div>
  );
};
