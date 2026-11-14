'use client';
// frontend/src/components/streaks/PageStreakBoard.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { PageStreakRoster } from './page-streak/PageStreakRoster';
import { reportAbandonAllKillers } from './challengeTracking';
import { abandonAllRuns, fetchRoster } from '@/services/pageStreakApi';
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
  const [confirmingAbandonAll, setConfirmingAbandonAll] = useState(false);
  const [abandoningAll, setAbandoningAll] = useState(false);

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

  const handleAbandonAll = async () => {
    if (!token) return;
    setAbandoningAll(true);
    try {
      await abandonAllRuns(token);
      reportAbandonAllKillers(roster);
      setConfirmingAbandonAll(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not abandon the runs');
    } finally {
      setAbandoningAll(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button
          type="button"
          onClick={() => setConfirmingAbandonAll(true)}
          variant="secondary" size="sm"
        >
          <RotateCcw />
          {dict.streaks.abandonAllRuns}
        </Button>
      </div>

      <ConfirmModal
        open={confirmingAbandonAll}
        title={dict.streaks.abandonAllRunsTitle}
        message={dict.streaks.abandonAllRunsPrompt}
        confirmLabel={dict.streaks.abandonConfirm}
        size="sm"
        busy={abandoningAll}
        onConfirm={() => { void handleAbandonAll(); }}
        onCancel={() => setConfirmingAbandonAll(false)}
      />

      <PageStreakRoster locale={locale} roster={roster} loading={loading} error={error} onRetry={() => { void load(); }} />
    </div>
  );
};
