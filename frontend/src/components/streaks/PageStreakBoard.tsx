'use client';
// frontend/src/components/streaks/PageStreakBoard.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { PageStreakRoster } from './page-streak/PageStreakRoster';
import { fetchRoster, resetAllRuns } from '@/services/pageStreakApi';
import type { RosterEntry } from '@/types/pageStreak';
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
  // Loading until the first roster for this session has arrived (a retry shows as loading too).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const loading = reloading || !token || loadedFor !== token;
  const [error, setError] = useState<string | null>(null);
  const [confirmingResetAll, setConfirmingResetAll] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  /** Fetches the roster; its state is set in the promise callbacks only. */
  const fetchInto = useCallback(
    (sessionToken: string) =>
      fetchRoster(sessionToken).then(
        ({ roster: fetchedRoster }) => {
          setRoster(fetchedRoster);
          setError(null);
        },
        (err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the roster')
      ),
    []
  );

  const load = useCallback(async () => {
    if (!token) return;
    setReloading(true);
    setError(null);
    try {
      await fetchInto(token);
    } finally {
      setReloading(false);
    }
  }, [token, fetchInto]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetchInto(token).finally(() => !cancelled && setLoadedFor(token));
    return () => {
      cancelled = true;
    };
  }, [token, fetchInto]);

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
        onConfirm={() => { void handleResetAll(); }}
        onCancel={() => setConfirmingResetAll(false)}
      />

      <PageStreakRoster locale={locale} roster={roster} loading={loading} error={error} onRetry={() => { void load(); }} />
    </div>
  );
};
