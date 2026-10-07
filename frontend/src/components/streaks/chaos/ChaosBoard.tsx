'use client';
// frontend/src/components/streaks/chaos/ChaosBoard.tsx

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Difficulty } from '@/types/chaosStreak';
import type { Perk } from '@/types/gauntletStreak';
import { useChaosRun } from './useChaosRun';
import { useOwnedKillers } from './useOwnedKillers';
import { useKillerPerkPool } from './useKillerPerkPool';
import { ChallengeErrorBanner, ChallengePanel, ChallengeVictoryCard } from '../ChallengePanel';
import { ChallengeProgress } from '../ChallengeProgress';
import { everyNthCheckpoint } from '@/utils/challengeCheckpoints';
import {
  CheckpointCelebrationModal,
  ChallengeCompletionHistoryDrawer,
  Confetti,
  ResetConfirmModal,
} from '../lazyChallengeParts';
import { useCelebrateOnRise, useCelebration } from '../useCelebration';
import { ChaosHeader } from './ChaosHeader';
import { SlotMachineStage } from './SlotMachineStage';
import { KillerPickerGrid } from './KillerPickerGrid';
import { useAuth } from '@/context/AuthContext';
import { saveChaosDifficulty } from '@/utils/streakDifficultyPrefs';
import { useDictionary } from '@/context/DictionaryContext';
import { useChallengeCompletionStatus } from '../useChallengeCompletionStatus';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';
import { tip } from '@/components/common/Tooltip';

const ChaosStatsDrawer = dynamic(
  () => import('./ChaosStatsDrawer').then((m) => m.ChaosStatsDrawer),
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

export const ChaosBoard: React.FC = () => {
  const dict = useDictionary();
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
  const [confirmingReset, setConfirmingReset] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isPerkPoolOpen, setIsPerkPoolOpen] = useState<boolean>(false);
  const [isChangeDifficultyOpen, setIsChangeDifficultyOpen] = useState<boolean>(false);

  const { celebrating, celebrate } = useCelebration();
  useCelebrateOnRise(justBankedCheckpoint != null, celebrate);

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

  const completionTitle = dict.streaks.chaosVictoryTitle;

  return (
    <div className="pb-16">
      <Confetti active={celebrating} />

      <div className="[&>*:last-child]:mb-0">
        {error && <ChallengeErrorBanner message={error} />}

        <ChallengePanel
          hasDrawAnimations
          progress={
            <ChallengeProgress
              current={run?.current_streak ?? 0}
              total={run?.owned_killers.length ?? rosterKillers.length}
              checkpoints={everyNthCheckpoint(run?.checkpoint_interval ?? 0, run?.owned_killers.length ?? rosterKillers.length)}
            />
          }
          header={
        <ChaosHeader
          difficulty={difficulty}
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          poolFrozen={poolFrozen}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenPerkPool={() => setIsPerkPoolOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
          onChangeDifficulty={() => setIsChangeDifficultyOpen(true)}
        />
          }
        >

        {isCompleted ? (
          <ChallengeVictoryCard title={completionTitle} onRestart={reset} busy={busy} />
        ) : (
          <SlotMachineStage
            perks={run?.current_perks || []}
            addonRarities={run?.current_addon_rarities || []}
            revealed={Boolean(run?.perks_revealed)}
            onPullLever={reveal}
            loading={loading || busy}
            locked={Boolean(acceptedKillerId)}
          />
        )}
        </ChallengePanel>

        {!isCompleted && (
          <>
            <div className="rounded-2xl border border-border-color bg-bg-surface/90 backdrop-blur-sm p-5 shadow-sm">
              <h3 className="type-label text-text-secondary mb-3">
                {dict.streaks.pickYourKiller}
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
                />
              </div>
            </div>

            <StreakActionBar>
              {!acceptedKillerId ? (
                <StreakActionButton
                  variant="red"
                  onClick={() => selectedKillerId && setAcceptedKillerId(selectedKillerId)}
                  disabled={busy || !run?.perks_revealed || !selectedKillerId}
                >
                  {dict.streaks.accept}
                </StreakActionButton>
              ) : (
                <>
                  <StreakActionButton variant="red" onClick={() => handleResult('loss')} disabled={busy}>
                    {dict.streaks.loseMatch}
                  </StreakActionButton>
                  <StreakActionButton variant="green" onClick={() => handleResult('win')} disabled={busy}>
                    {dict.streaks.winMatch}
                  </StreakActionButton>
                </>
              )}
            </StreakActionBar>
          </>
        )}

        {!isCompleted && isAdmin && (
          <div className="mt-6 rounded-2xl border border-border-color/80 bg-bg-surface/90 backdrop-blur-sm px-4 py-4 shadow-sm">
            <button
              type="button"
              onClick={handleDevSkipToWin}
              disabled={busy || !killers.length}
              {...tip(dict.streaks.devSkipWinTitle, undefined, 'action')} aria-label={dict.streaks.devSkipWinTitle}
              className="inline-flex items-center gap-2 type-strong text-accent-amber border border-accent-amber/30 bg-accent-amber/10 hover:bg-accent-amber/20 disabled:opacity-50 transition-colors cursor-pointer rounded-lg px-2.5 py-1"
            >
              <AdeptBadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{dict.streaks.devSkipWinLabel}</span>
            </button>
          </div>
        )}

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message={dict.streaks.resetConfirmPrompt}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={handleReset}
        />

        <ChaosStatsDrawer
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
          attempts={run?.attempts}
        />
        <ChallengeCompletionHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          completions={completions}
          subjectLabel={dict.streaks.killersLabel}
        />
        <ChaosRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        <ChaosPerkPoolModal
          isOpen={isPerkPoolOpen}
          onClose={() => setIsPerkPoolOpen(false)}
          pool={rosterPerkPool}
          usedPerkNames={run?.used_perks || []}
        />
        <CheckpointCelebrationModal checkpoint={justBankedCheckpoint} onClose={dismissCheckpointCelebration} />
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
        />
      </div>
    </div>
  );
};
