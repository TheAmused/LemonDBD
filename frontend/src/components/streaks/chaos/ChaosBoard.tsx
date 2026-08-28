'use client';
// frontend/src/components/streaks/chaos/ChaosBoard.tsx

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import type { Difficulty } from '@/types/chaosStreak';
import type { Perk } from '@/types/gauntletStreak';
import { Confetti, CONFETTI_LIFETIME_MS } from '../Confetti';
import { ResetConfirmModal } from '../ResetConfirmModal';
import { useChaosRun } from './useChaosRun';
import { useOwnedKillers } from './useOwnedKillers';
import { useKillerPerkPool } from './useKillerPerkPool';
import { ChaosHeader } from './ChaosHeader';
import { ChaosProgressBar } from './ChaosProgressBar';
import { SlotMachineStage } from './SlotMachineStage';
import { KillerPickerGrid } from './KillerPickerGrid';
import { ChaosCheckpointModal } from './ChaosCheckpointModal';
import { ChaosStatsDrawer } from './ChaosStatsDrawer';
import { ChaosRulesModal } from './ChaosRulesModal';
import { ChaosPerkPoolModal } from './ChaosPerkPoolModal';
import { ChaosModeModal } from './ChaosModeModal';
import { useAuth } from '@/context/AuthContext';
import { saveChaosDifficulty } from '@/utils/streakDifficultyPrefs';
import { useStreaksDict } from '@/context/StreaksDictContext';

interface ChaosBoardProps {
  locale: string;
}

export const ChaosBoard: React.FC<ChaosBoardProps> = ({ locale }) => {
  const dict = useStreaksDict();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
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
  const { killers, loading: loadingKillers, releaseOrder } = useOwnedKillers();
  const { pool: perkPool } = useKillerPerkPool();
  const { isAdmin } = useAuth();

  const rosterKillers = useMemo(() => {
    if (!run) return killers;
    return [...run.owned_killers].sort(
      (a, b) => (releaseOrder.get(a) ?? Infinity) - (releaseOrder.get(b) ?? Infinity)
    );
  }, [run, releaseOrder, killers]);

  const perkPoolByName = useMemo(
    () => new Map(perkPool.map((p) => [p.name, p] as const)),
    [perkPool]
  );

  const rosterPerkPool: Perk[] = useMemo(() => {
    if (!run) return perkPool;
    return run.unlocked_perks
      .map((name) => perkPoolByName.get(name))
      .filter((p): p is Perk => Boolean(p));
  }, [run, perkPool, perkPoolByName]);

  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null);
  const [acceptedKillerId, setAcceptedKillerId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<boolean>(false);
  const [confirmingReset, setConfirmingReset] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isPerkPoolOpen, setIsPerkPoolOpen] = useState<boolean>(false);
  const [isChangeDifficultyOpen, setIsChangeDifficultyOpen] = useState<boolean>(false);

  const celebrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const celebrate = () => {
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    setCelebrating(true);
    celebrationTimerRef.current = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
  };

  useEffect(() => () => {
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
  }, []);

  useEffect(() => {
    if (justBankedCheckpoint == null) return;
    celebrate();
  }, [justBankedCheckpoint]);

  const isCompleted = run?.status === 'completed';

  const clearPick = () => {
    setSelectedKillerId(null);
    setAcceptedKillerId(null);
  };

  const handleResult = async (result: 'win' | 'loss') => {
    if (!acceptedKillerId) return;
    const updated = await submitResult(result, acceptedKillerId);
    if (!updated) return;
    clearPick();
    if (updated.status === 'completed') {
      celebrate();
    }
  };

  const handleReset = () => {
    setConfirmingReset(false);
    clearPick();
    reset();
  };

  const handleDevSkipToWin = async () => {
    clearPick();
    const remaining = killers.filter((name) => !(run?.completed_killers || []).includes(name));
    for (const killer of remaining) {
      const updated = await submitResult('win', killer, { silent: true });
      if (updated?.status === 'completed') {
        celebrate();
        break;
      }
    }
  };

  const completionTitle =
    dict?.streaks?.chaosStreakComplete ||
    dict?.streaks?.streakComplete ||
    dict?.streaks?.chaosStreak ||
    '';

  const youWonText = dict?.streaks?.youWonOn
    ? `${dict.streaks.youWonOn} `
    : '';

  const modeSuffixText = dict?.streaks?.modeSuffix
    ? ` ${dict.streaks.modeSuffix}`
    : '';

  return (
    <div>
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/killer`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-violet-500 dark:text-slate-400 dark:hover:text-violet-400 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{dict?.streaks?.backToKillerStreaks || ''}</span>
      </Link>

      <div className="mt-4">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-center justify-between shadow-lg" role="alert">
            <span>{error}</span>
          </div>
        )}

        <ChaosHeader
          difficulty={difficulty}
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          lastCheckpointStreak={run?.last_checkpoint_streak || 0}
          poolFrozen={run?.pool_frozen}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenPerkPool={() => setIsPerkPoolOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
          onChangeDifficulty={() => setIsChangeDifficultyOpen(true)}
        />

        {!isCompleted && rosterKillers.length > 0 && (
          <ChaosProgressBar
            currentStreak={run?.current_streak || 0}
            lastCheckpointStreak={run?.last_checkpoint_streak || 0}
            checkpointInterval={run?.checkpoint_interval || 0}
            totalKillers={rosterKillers.length}
          />
        )}

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400" aria-hidden="true">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {completionTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {youWonText}<span className="capitalize font-bold">{difficulty}</span>{modeSuffixText}
            </p>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>{dict?.streaks?.startNewRun || ''}</span>
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
                locked={Boolean(acceptedKillerId)}
              />
            </div>
            <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                {dict?.streaks?.pickYourKiller || ''}
              </h3>

              {!acceptedKillerId ? (
                <div className="mt-5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => selectedKillerId && setAcceptedKillerId(selectedKillerId)}
                    disabled={busy || !run?.perks_revealed || !selectedKillerId}
                    className="flex-1 max-w-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    {dict?.streaks?.acceptPick || ''}
                  </button>
                </div>
              ) : (
                <div className="mt-5 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleResult('win')}
                    disabled={busy}
                    className="flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    {dict?.streaks?.winMatch || ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResult('loss')}
                    disabled={busy}
                    className="flex-1 max-w-xs bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    {dict?.streaks?.loseMatch || ''}
                  </button>
                </div>
              )}

              <div
                className={`mt-5 transition-opacity ${run?.perks_revealed ? '' : 'opacity-40 pointer-events-none'
                  }`}
              >
                <KillerPickerGrid
                  killers={rosterKillers}
                  completedKillers={run?.completed_killers || []}
                  selectedKillerId={acceptedKillerId ?? selectedKillerId}
                  onSelect={setSelectedKillerId}
                  disabled={busy || Boolean(acceptedKillerId) || !run?.perks_revealed}
                  loading={loadingKillers}
                />
              </div>
            </div>
          </>
        )}

        {!isCompleted && isAdmin && (
          <div className="mt-10 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm px-4 py-4 shadow-sm">
            <button
              type="button"
              onClick={handleDevSkipToWin}
              disabled={busy || !killers.length}
              title={dict?.streaks?.devSkipWinTitle || ''}
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 transition-colors cursor-pointer rounded-lg px-2.5 py-1"
            >
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dict?.streaks?.devSkipWinLabel || ''}</span>
            </button>
          </div>
        )}

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message={dict?.streaks?.resetConfirmPrompt || ''}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={handleReset}
        />

        <ChaosStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        <ChaosRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        <ChaosPerkPoolModal
          isOpen={isPerkPoolOpen}
          onClose={() => setIsPerkPoolOpen(false)}
          pool={rosterPerkPool}
          usedPerkNames={run?.used_perks || []}
          dict={dict}
        />
        <ChaosCheckpointModal checkpoint={justBankedCheckpoint} onClose={dismissCheckpointCelebration} />
        <ChaosModeModal
          isOpen={isChangeDifficultyOpen}
          onClose={() => setIsChangeDifficultyOpen(false)}
          currentDifficulty={difficulty}
          onSelectDifficulty={(newDifficulty) => {
            saveChaosDifficulty(newDifficulty);
            setIsChangeDifficultyOpen(false);
            router.push(`${pathname}?difficulty=${newDifficulty}`);
          }}
          dict={dict}
        />
      </div>
    </div>
  );
};