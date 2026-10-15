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

import { Button } from '@/components/common/Button';
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
        <Button
          type="button"
          onClick={() => setConfirmingResetAll(true)}
          variant="secondary" size="sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {dict.streaks.resetAllRuns}
        </Button>
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
