// frontend/src/components/streaks/history/HistoryBoard.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { HistoryMode } from '@/types/historyStreak';
import { Confetti, CONFETTI_LIFETIME_MS } from '../Confetti';
import { ResetConfirmModal } from '../ResetConfirmModal';
import { useHistoryRun } from './useHistoryRun';
import { useKillerPerkPool } from '../chaos/useKillerPerkPool';
import { KillerPickerGrid } from '../chaos/KillerPickerGrid';
import { HistoryHeader } from './HistoryHeader';
import { HistoryStatsDrawer } from './HistoryStatsDrawer';
import { HistoryPerkPoolPanel } from './HistoryPerkPoolPanel';
import { HistoryPerkModal } from './HistoryPerkModal';
import { HistoryNextRowPreview } from './HistoryNextRowPreview';
import { HistoryRowClearedBanner } from './HistoryRowClearedBanner';
import { HistoryRulesModal } from './HistoryRulesModal';
import { Perk } from '@/types/gauntletStreak';

interface HistoryBoardProps {
  locale: string;
}

export const HistoryBoard: React.FC<HistoryBoardProps> = ({ locale }) => {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as HistoryMode) || 'hell';

  const { run, stats, loading, busy, error, submitResult, reset } = useHistoryRun(mode);
  const { pool: perkPool } = useKillerPerkPool();

  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null);
  const [acceptedKillerId, setAcceptedKillerId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [perkModal, setPerkModal] = useState<{ killerName: string; perks: Perk[] } | null>(null);
  const [rowClearedNumber, setRowClearedNumber] = useState<number | null>(null);

  const isCompleted = run?.status === 'completed';

  const clearPick = () => {
    setSelectedKillerId(null);
    setAcceptedKillerId(null);
  };

  const handleResult = async (result: 'win' | 'loss') => {
    if (!acceptedKillerId) return;
    const killerName = acceptedKillerId;
    clearPick();
    const updated = await submitResult(result, killerName);
    if (!updated) return;

    if (result === 'win') {
      const newlyUnlockedNames = updated.newly_unlocked_perks || [];
      const perks = perkPool.filter((p) => newlyUnlockedNames.includes(p.name));
      setPerkModal({ killerName, perks });
      if (updated.row_cleared && updated.status !== 'completed') {
        setRowClearedNumber(updated.current_row_index);
      }
    }
    if (updated.status === 'completed') {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
    }
  };

  const handleReset = () => {
    setConfirmingReset(false);
    clearPick();
    reset();
  };

  return (
    <div>
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/killer`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to killer streaks</span>
      </Link>

      <div className="mt-4">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-center justify-between shadow-lg">
            <span>{error}</span>
          </div>
        )}

        <HistoryHeader
          mode={mode}
          totalKillersBeaten={run?.total_killers_beaten || 0}
          bestKillersBeaten={run?.best_killers_beaten || 0}
          checkpointRowIndex={run?.checkpoint_row_index || 0}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
        />

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              History Streak complete!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 capitalize">
              You beat every row on {mode} mode.
            </p>
            <button
              onClick={reset}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Start a new run
            </button>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3 text-center sm:text-left">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Pick your killer
              </h3>
              {run && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Row {run.current_row_index + 1} of {run.total_rows} &middot; killer{' '}
                  {run.total_killers_beaten + 1} of {run.total_owned_killers}
                </p>
              )}
            </div>

            <KillerPickerGrid
              killers={run?.current_row_killers || []}
              completedKillers={run?.completed_killers || []}
              selectedKillerId={acceptedKillerId ?? selectedKillerId}
              onSelect={setSelectedKillerId}
              disabled={busy || Boolean(acceptedKillerId)}
              loading={loading}
              center
            />

            <div className="mt-5 flex items-center justify-center gap-4">
              {!acceptedKillerId ? (
                <button
                  onClick={() => selectedKillerId && setAcceptedKillerId(selectedKillerId)}
                  disabled={busy || !selectedKillerId}
                  className="flex-1 max-w-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  ACCEPT PICK
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleResult('win')}
                    disabled={busy}
                    className="flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    WIN MATCH
                  </button>
                  <button
                    onClick={() => handleResult('loss')}
                    disabled={busy}
                    className="flex-1 max-w-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    LOSE MATCH
                  </button>
                </>
              )}
            </div>

            {run && (
              <HistoryNextRowPreview
                killers={run.owned_killers}
                rowSize={run.row_size}
                currentRowIndex={run.current_row_index}
              />
            )}
          </div>
        )}

        {!isCompleted && run && (
          <HistoryPerkPoolPanel pool={perkPool} unlockedPerkNames={run.unlocked_perk_names || []} />
        )}

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message="Row progress and every unlocked perk go back to the start. This cannot be undone."
          onCancel={() => setConfirmingReset(false)}
          onConfirm={handleReset}
        />

        <HistoryStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        <HistoryRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        <HistoryPerkModal
          killerName={perkModal?.killerName ?? null}
          perks={perkModal?.perks ?? []}
          onClose={() => setPerkModal(null)}
        />
        <HistoryRowClearedBanner rowNumber={rowClearedNumber} onClose={() => setRowClearedNumber(null)} />
      </div>
    </div>
  );
};
