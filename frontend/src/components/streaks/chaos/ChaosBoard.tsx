'use client';
// frontend/src/components/streaks/chaos/ChaosBoard.tsx

import React, { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import type { Difficulty } from '@/types/chaosStreak';
import type { Perk } from '@/types/gauntletStreak';
import { CONFETTI_LIFETIME_MS } from '../Confetti';
import { useChaosRun } from './useChaosRun';
import { useOwnedKillers } from './useOwnedKillers';
import { useKillerPerkPool } from './useKillerPerkPool';
import { ChaosHeader } from './ChaosHeader';
import { SlotMachineStage } from './SlotMachineStage';
import { KillerPickerGrid } from './KillerPickerGrid';
import { useAuth } from '@/context/AuthContext';
import { saveChaosDifficulty } from '@/utils/streakDifficultyPrefs';
import { useStreaksDict } from '@/context/StreaksDictContext';
import { useChallengeCompletionStatus } from '../useChallengeCompletionStatus';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

const Confetti = dynamic(() => import('../Confetti').then((m) => m.Confetti), { ssr: false });
const ResetConfirmModal = dynamic(
  () => import('../ResetConfirmModal').then((m) => m.ResetConfirmModal),
  { ssr: false }
);
const ChaosCheckpointModal = dynamic(
  () => import('./ChaosCheckpointModal').then((m) => m.ChaosCheckpointModal),
  { ssr: false }
);
const ChaosStatsDrawer = dynamic(
  () => import('./ChaosStatsDrawer').then((m) => m.ChaosStatsDrawer),
  { ssr: false }
);
const ChallengeCompletionHistoryDrawer = dynamic(
  () => import('../ChallengeCompletionHistoryDrawer').then((m) => m.ChallengeCompletionHistoryDrawer),
  { ssr: false }
);
const ChaosRulesModal = dynamic(
  () => import('./ChaosRulesModal').then((m) => m.ChaosRulesModal),
  { ssr: false }
);
const ChaosPerkPoolModal = dynamic(
  () => import('./ChaosPerkPoolModal').then((m) => m.ChaosPerkPoolModal),
  { ssr: false }
);
const ChaosModeModal = dynamic(
  () => import('./ChaosModeModal').then((m) => m.ChaosModeModal),
  { ssr: false }
);

interface ChaosBoardProps {
  locale: string;
}

export const ChaosBoard: React.FC<ChaosBoardProps> = ({ locale }) => {
  const dict = useStreaksDict();
  const completionStatus = useChallengeCompletionStatus();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const difficulty = (searchParams.get('difficulty') as Difficulty) || 'hell';

  const {
    run,
    stats,
    completions,
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

  // perks_revealed flips back to false after every round (win or loss), so
  // gating the freeze badge on it directly makes it flicker off between
  // rounds. Track whether THIS run has ever been revealed at least once
  // instead -- that stays true for the run's whole lifetime, only resetting
  // when reset/completion swaps in a different run id.
  const [engagedRunId, setEngagedRunId] = useState<number | null>(null);
  useEffect(() => {
    if (run?.perks_revealed && run.id !== engagedRunId) {
      setEngagedRunId(run.id);
    }
  }, [run?.perks_revealed, run?.id, engagedRunId]);
  const poolFrozen = Boolean(run?.pool_frozen) && run?.id === engagedRunId;

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
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
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

  const completionTitle = dict?.streaks?.chaosVictoryTitle || 'You won the Chaos Streak';

  return (
    <div>
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/killer`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-text-secondary hover:text-accent-red transition-colors focus:outline-none focus:ring-2 focus:ring-accent-red"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{dict?.streaks?.backToKillerStreaks || ''}</span>
      </Link>

      <div className="mt-4">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-accent-red/15 border border-accent-red/40 text-accent-red text-sm flex items-center justify-between shadow-xs" role="alert">
            <span>{error}</span>
          </div>
        )}

        <ChaosHeader
          difficulty={difficulty}
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          lastCheckpointStreak={run?.last_checkpoint_streak || 0}
          poolFrozen={poolFrozen}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenPerkPool={() => setIsPerkPoolOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
          onChangeDifficulty={() => setIsChangeDifficultyOpen(true)}
          dict={dict}
        />

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-accent-green/40 bg-gradient-to-b from-accent-green/10 to-accent-green/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-accent-green bg-accent-green/15 text-accent-green" aria-hidden="true">
              <AdeptBadgeIcon className="h-8 w-8" />
            </div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-accent-green">
              {dict?.streaks?.victoryCongrats || 'Congratulations'}
            </p>
            <h2 className="text-2xl font-black tracking-tight text-text-primary">
              {completionTitle}
            </h2>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-green px-6 py-3 text-sm font-extrabold text-text-inverted shadow-xs transition-colors hover:bg-accent-green-hover disabled:opacity-50 cursor-pointer"
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
                dict={dict}
              />
            </div>
            <div className="mb-6 rounded-2xl border border-border-color bg-bg-surface/90 backdrop-blur-sm p-5 pb-24 shadow-sm">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">
                {dict?.streaks?.pickYourKiller || ''}
              </h3>

              <div
                className={`transition-opacity ${run?.perks_revealed ? '' : 'opacity-40 pointer-events-none'
                  }`}
              >
                <KillerPickerGrid
                  killers={rosterKillers}
                  completedKillers={run?.completed_killers || []}
                  selectedKillerId={acceptedKillerId ?? selectedKillerId}
                  onSelect={setSelectedKillerId}
                  disabled={busy || Boolean(acceptedKillerId) || !run?.perks_revealed}
                  loading={loadingKillers}
                  dict={dict}
                />
              </div>
            </div>

            {/* Same fixed sidebar-aware bottom bar as the character ownership
                editor (CharactersHub), so this is always reachable without
                scrolling through the (potentially long) killer roster above. */}
            <div className="fixed left-[var(--sidebar-width,0rem)] right-0 bottom-0 z-30 border-t border-border-color bg-bg-surface/95 shadow-2xl backdrop-blur-md transition-[left] duration-300">
              <div className="flex items-center justify-center gap-3 px-5 sm:px-7 lg:px-9 py-2.5">
                {!acceptedKillerId ? (
                  <button
                    type="button"
                    onClick={() => selectedKillerId && setAcceptedKillerId(selectedKillerId)}
                    disabled={busy || !run?.perks_revealed || !selectedKillerId}
                    className="flex-1 max-w-xs bg-accent-red hover:bg-accent-red-hover disabled:opacity-50 text-text-inverted font-extrabold text-base py-3.5 px-6 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {dict?.streaks?.acceptPick || ''}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleResult('win')}
                      disabled={busy}
                      className="flex-1 max-w-xs bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 text-text-inverted font-extrabold text-base py-3.5 px-6 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      {dict?.streaks?.winMatch || ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResult('loss')}
                      disabled={busy}
                      className="flex-1 max-w-xs bg-accent-red hover:bg-accent-red-hover disabled:opacity-50 text-text-inverted font-extrabold text-base py-3.5 px-6 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      {dict?.streaks?.loseMatch || ''}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {!isCompleted && isAdmin && (
          <div className="mt-10 rounded-2xl border border-border-color/80 bg-bg-surface/90 backdrop-blur-sm px-4 py-4 shadow-sm">
            <button
              type="button"
              onClick={handleDevSkipToWin}
              disabled={busy || !killers.length}
              title={dict?.streaks?.devSkipWinTitle || ''}
              className="inline-flex items-center gap-2 text-xs font-bold text-accent-amber border border-accent-amber/30 bg-accent-amber/10 hover:bg-accent-amber/20 disabled:opacity-50 transition-colors cursor-pointer rounded-lg px-2.5 py-1"
            >
              <AdeptBadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dict?.streaks?.devSkipWinLabel || ''}</span>
            </button>
          </div>
        )}

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message={dict?.streaks?.resetConfirmPrompt || 'Streak, checkpoints and your unlocked pool go back to zero. This cannot be undone.'}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={handleReset}
          dict={dict}
        />

        <ChaosStatsDrawer
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
          attempts={run?.attempts}
          dict={dict}
        />
        <ChallengeCompletionHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title={dict?.streaks?.chaosStreak || 'Chaos Streak'}
          accent="amber"
          completions={completions}
          subjectLabel={dict?.streaks?.killersLabel || 'killers'}
          dict={dict}
        />
        <ChaosRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
        <ChaosPerkPoolModal
          isOpen={isPerkPoolOpen}
          onClose={() => setIsPerkPoolOpen(false)}
          pool={rosterPerkPool}
          usedPerkNames={run?.used_perks || []}
          dict={dict}
        />
        <ChaosCheckpointModal checkpoint={justBankedCheckpoint} onClose={dismissCheckpointCelebration} dict={dict} />
        <ChaosModeModal
          isOpen={isChangeDifficultyOpen}
          onClose={() => setIsChangeDifficultyOpen(false)}
          currentDifficulty={difficulty}
          showIntro={false}
          completedCounts={completionStatus.completion_counts.chaos ?? {}}
          completedFullCounts={completionStatus.full_roster.chaos ?? {}}
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