// frontend/src/components/streaks/chaos/ChaosBoard.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { Difficulty } from '@/types/chaosStreak';
import { Confetti, CONFETTI_LIFETIME_MS } from '../Confetti';
import { useChaosRun } from './useChaosRun';
import { useOwnedKillers } from './useOwnedKillers';
import { SlotMachineStage } from './SlotMachineStage';
import { KillerPickerGrid } from './KillerPickerGrid';
import { ChaosCheckpointModal } from './ChaosCheckpointModal';

interface ChaosBoardProps {
  locale: string;
}

export const ChaosBoard: React.FC<ChaosBoardProps> = ({ locale }) => {
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get('difficulty') as Difficulty) || 'hell';

  const {
    run,
    stats,
    loading,
    busy,
    error,
    submitResult,
    reveal,
    reset,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  } = useChaosRun(difficulty);
  const { killers, loading: loadingKillers } = useOwnedKillers();

  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const wasCompletedRef = useRef(false);
  useEffect(() => {
    const completed = run?.status === 'completed';
    if (completed && !wasCompletedRef.current) {
      setCelebrating(true);
      wasCompletedRef.current = true;
      const timer = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
      return () => clearTimeout(timer);
    }
    if (!completed) {
      wasCompletedRef.current = false;
    }
  }, [run?.status]);

  useEffect(() => {
    if (justBankedCheckpoint == null) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [justBankedCheckpoint]);

  useEffect(() => {
    setSelectedKillerId(null);
  }, [run?.current_perks]);

  const isCompleted = run?.status === 'completed';
  const remainingKillers = killers.filter((name) => !(run?.completed_killers || []).includes(name));

  const handleResult = (result: 'win' | 'loss') => {
    if (!selectedKillerId) return;
    submitResult(result, selectedKillerId);
  };

  return (
    <div>
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/killer`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-violet-500 dark:text-slate-400 dark:hover:text-violet-400 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
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

        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
              Chaos Streak &middot; {difficulty}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Streak {run?.current_streak ?? 0} &middot; Best {run?.best_streak ?? 0}
            </p>
          </div>
          {stats && stats.total_matches > 0 && (
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <p className="font-bold text-slate-700 dark:text-slate-200">{stats.win_rate}% win rate</p>
              <p>
                {stats.wins}W / {stats.losses}L across {stats.total_matches} matches
              </p>
            </div>
          )}
        </header>

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Chaos Streak complete!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You won with every killer you own on {difficulty}.
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
          <>
            <div className="mb-6">
              <SlotMachineStage
                perks={run?.current_perks || []}
                addonRarities={run?.current_addon_rarities || []}
                revealed={Boolean(run?.perks_revealed)}
                onPullLever={reveal}
                loading={loading || busy}
              />
            </div>

            {run?.perks_revealed && (
              <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Pick your killer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A win needs 3 kills or more.
                  </p>
                </div>
                <KillerPickerGrid
                  killers={remainingKillers}
                  completedKillers={run?.completed_killers || []}
                  selectedKillerId={selectedKillerId}
                  onSelect={setSelectedKillerId}
                  disabled={busy}
                  loading={loadingKillers}
                />

                <div className="mt-5 flex items-center justify-center gap-4">
                  <button
                    onClick={() => handleResult('win')}
                    disabled={busy || !selectedKillerId}
                    className="flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    WIN MATCH
                  </button>
                  <button
                    onClick={() => handleResult('loss')}
                    disabled={busy || !selectedKillerId}
                    className="flex-1 max-w-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    LOSE MATCH
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!isCompleted && (
          <div className="mt-10 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm px-4 py-4 shadow-sm">
            {confirmingReset ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Wipe this run? Streak, checkpoints and every cleared killer go back to zero. This cannot be
                  undone.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingReset(false);
                      reset();
                    }}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Yes, wipe it
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingReset(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset this run
              </button>
            )}
          </div>
        )}

        <ChaosCheckpointModal checkpoint={justBankedCheckpoint} onClose={dismissCheckpointCelebration} />
      </div>
    </div>
  );
};
