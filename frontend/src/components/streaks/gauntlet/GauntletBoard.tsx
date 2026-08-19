'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { Role } from '@/types/gauntletStreak';
import { Confetti } from '../Confetti';
import { useGauntletRun } from './useGauntletRun';
import { useOwnedCharacters } from './useOwnedCharacters';
import { GauntletHeader } from './GauntletHeader';
import { ActiveTargetStage } from './ActiveTargetStage';
import { CharacterRosterGrid } from './CharacterRosterGrid';
import { GauntletStatsDrawer } from './GauntletStatsDrawer';
import { GauntletRulesModal } from './GauntletRulesModal';

interface GauntletBoardProps {
  locale: string;
  role: Role;
}

export const GauntletBoard: React.FC<GauntletBoardProps> = ({ locale, role }) => {
  const { run, stats, loading, busy, error, submitResult, reveal, reset } = useGauntletRun(role);
  const { characters, loading: loadingRoster } = useOwnedCharacters(role);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Fire once when the run flips to completed, not on every later render or reload.
  const wasCompletedRef = useRef(false);
  useEffect(() => {
    const completed = run?.status === 'completed';
    if (completed && !wasCompletedRef.current) {
      setCelebrating(true);
      wasCompletedRef.current = true;
      const timer = setTimeout(() => setCelebrating(false), 3500);
      return () => clearTimeout(timer);
    }
    if (!completed) {
      wasCompletedRef.current = false;
    }
  }, [run?.status]);

  const isCompleted = run?.status === 'completed';

  return (
    <div>
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/${role}`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="capitalize">Back to {role} streaks</span>
      </Link>

      <div className="mt-4">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-center justify-between shadow-lg">
            <span>{error}</span>
          </div>
        )}

        <GauntletHeader
          role={role}
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          lastCheckpointStreak={run?.last_checkpoint_streak || 0}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
        />

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Gauntlet complete!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You won the {role} Gauntlet.
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
          <ActiveTargetStage
            run={run}
            role={role}
            characters={characters}
            loading={loading || busy}
            onWin={() => submitResult('win')}
            onLoss={() => submitResult('loss')}
            onReveal={reveal}
          />
        )}

        <CharacterRosterGrid
          role={role}
          characters={characters}
          completedCharacters={run?.completed_characters || []}
          checkpointCharacters={run?.checkpoint_characters || []}
          activeCharacterId={isCompleted ? undefined : run?.current_character_id}
          loading={loadingRoster}
        />

        {!isCompleted && (
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80">
            {confirmingReset ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/5 px-4 py-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Wipe this run? Streak, checkpoints and every cleared {role} go back to zero. This cannot be
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
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset this run
              </button>
            )}
          </div>
        )}

        <GauntletStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} />
      </div>
    </div>
  );
};
