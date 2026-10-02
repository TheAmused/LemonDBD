'use client';
// frontend/src/components/streaks/history/HistoryBoard.tsx
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { HistoryMode } from '@/types/historyStreak';
import { useHistoryRun } from './useHistoryRun';
import { useKillerPerkPool } from '../chaos/useKillerPerkPool';
import { KillerPickerGrid } from '../chaos/KillerPickerGrid';
import { ChallengeErrorBanner, ChallengePanel, ChallengeVictoryCard } from '../ChallengePanel';
import { ChallengeProgress } from '../ChallengeProgress';
import { everyNthCheckpoint } from '@/utils/challengeCheckpoints';
import { ChallengeCompletionHistoryDrawer, Confetti, ResetConfirmModal } from '../lazyChallengeParts';
import { useCelebration } from '../useCelebration';
import { HistoryHeader } from './HistoryHeader';
import { HistoryPerkPoolPanel } from './HistoryPerkPoolPanel';
import { HistoryNextRowPreview } from './HistoryNextRowPreview';
import { HistoryRowClearedBanner } from './HistoryRowClearedBanner';
import { Perk } from '@/types/gauntletStreak';
import { saveHistoryMode } from '@/utils/streakDifficultyPrefs';
import { useStreaksDict } from '@/context/StreaksDictContext';
import { useChallengeCompletionStatus } from '../useChallengeCompletionStatus';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';

const HistoryStatsDrawer = dynamic(
  () => import('./HistoryStatsDrawer').then((m) => m.HistoryStatsDrawer),
  { ssr: false }
);
const HistoryPerkModal = dynamic(
  () => import('./HistoryPerkModal').then((m) => m.HistoryPerkModal),
  { ssr: false }
);
const HistoryRulesModal = dynamic(
  () => import('./HistoryRulesModal').then((m) => m.HistoryRulesModal),
  { ssr: false }
);
const HistoryModeModal = dynamic(
  () => import('./HistoryModeModal').then((m) => m.HistoryModeModal),
  { ssr: false }
);

interface HistoryBoardProps {
  locale: string;
}

export const HistoryBoard: React.FC<HistoryBoardProps> = ({ locale }) => {
  const dict = useStreaksDict();
  const completionStatus = useChallengeCompletionStatus();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mode = (searchParams.get('mode') as HistoryMode) || 'hell';

  const { run, stats, completions, loading, busy, error, submitResult, reset } = useHistoryRun(mode);
  const { pool: perkPool } = useKillerPerkPool();

  const [selectedKillerId, setSelectedKillerId] = useState<string | null>(null);
  const [acceptedKillerId, setAcceptedKillerId] = useState<string | null>(null);
  const { celebrating, celebrate } = useCelebration();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [perkModal, setPerkModal] = useState<{ killerName: string; perks: Perk[] } | null>(null);
  const [rowClearedNumber, setRowClearedNumber] = useState<number | null>(null);
  const [isChangeModeOpen, setIsChangeModeOpen] = useState(false);

  const isCompleted = run?.status === 'completed';

  const clearPick = () => {
    setSelectedKillerId(null);
    setAcceptedKillerId(null);
  };

  // acceptedKillerId clears after every round (win or loss), so gating the
  // freeze badge on it directly makes it flicker off between rounds. Track
  // whether THIS run has ever had a pick accepted at least once instead --
  // that stays true for the run's whole lifetime, only resetting when
  // reset/completion swaps in a different run id.
  const [engagedRunId, setEngagedRunId] = useState<number | null>(null);
  useEffect(() => {
    if (acceptedKillerId && run?.id !== engagedRunId) {
      setEngagedRunId(run?.id ?? null);
    }
  }, [acceptedKillerId, run?.id, engagedRunId]);
  const poolFrozen = Boolean(run?.pool_frozen) && run?.id === engagedRunId;

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
    if (updated.status === 'completed') celebrate();
  };

  const handleReset = () => {
    setConfirmingReset(false);
    clearPick();
    reset();
  };

  return (
    <div className="pb-16">
      <Confetti active={celebrating} />

      <div className="[&>*:last-child]:mb-0">
        {error && <ChallengeErrorBanner message={error} />}

        <ChallengePanel
          progress={
            <ChallengeProgress
              current={run?.total_killers_beaten ?? 0}
              total={run?.total_owned_killers ?? 0}
              checkpoints={everyNthCheckpoint(mode === 'medium' ? (run?.row_size ?? 0) : 0, run?.total_owned_killers ?? 0)}
              dict={dict}
            />
          }
          header={
        <HistoryHeader
          mode={mode}
          totalKillersBeaten={run?.total_killers_beaten || 0}
          bestKillersBeaten={run?.best_killers_beaten || 0}
          poolFrozen={poolFrozen}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
          onChangeMode={() => setIsChangeModeOpen(true)}
          dict={dict}
        />
          }
        >

        {isCompleted ? (
          <ChallengeVictoryCard
            title={dict?.streaks?.historyStreakComplete || 'You won the History Streak'}
            onRestart={reset}
            busy={busy}
            dict={dict}
          />
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3 text-center sm:text-left">
              <h3 className="type-label text-text-secondary">
                {dict?.streaks?.pickYourKiller || 'Pick your killer'}
              </h3>
              {run && (
                <p className="text-xs text-text-muted">
                  {dict?.streaks?.rowLabel || 'Row'} {run.current_row_index + 1}{' '}
                  {dict?.streaks?.ofLabel || 'of'} {run.total_rows}
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
              dict={dict}
            />

            {run && (
              <HistoryNextRowPreview
                killers={run.owned_killers}
                rowSize={run.row_size}
                currentRowIndex={run.current_row_index}
                dict={dict}
              />
            )}

            <StreakActionBar>
              {!acceptedKillerId ? (
                <StreakActionButton
                  variant="red"
                  onClick={() => selectedKillerId && setAcceptedKillerId(selectedKillerId)}
                  disabled={busy || !selectedKillerId}
                >
                  {dict?.streaks?.accept || 'ACCEPT'}
                </StreakActionButton>
              ) : (
                <>
                  <StreakActionButton variant="red" onClick={() => handleResult('loss')} disabled={busy}>
                    {dict?.streaks?.loseMatch || 'LOSE MATCH'}
                  </StreakActionButton>
                  <StreakActionButton variant="green" onClick={() => handleResult('win')} disabled={busy}>
                    {dict?.streaks?.winMatch || 'WIN MATCH'}
                  </StreakActionButton>
                </>
              )}
            </StreakActionBar>
          </div>
        )}
        </ChallengePanel>

        {!isCompleted && run && (
          <HistoryPerkPoolPanel pool={perkPool} unlockedPerkNames={run.unlocked_perk_names || []} dict={dict} />
        )}

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message={dict?.streaks?.historyResetConfirmPrompt || 'Row progress and every unlocked perk go back to the start. This cannot be undone.'}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={handleReset}
          dict={dict}
        />

        <HistoryStatsDrawer
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
          attempts={run?.attempts}
          dict={dict}
        />
        <ChallengeCompletionHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          completions={completions}
          subjectLabel={dict?.streaks?.killersLabel || 'killers'}
          dict={dict}
        />
        <HistoryRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
        <HistoryPerkModal
          killerName={perkModal?.killerName ?? null}
          perks={perkModal?.perks ?? []}
          locale={locale}
          onClose={() => setPerkModal(null)}
          dict={dict}
        />
        <HistoryRowClearedBanner rowNumber={rowClearedNumber} onClose={() => setRowClearedNumber(null)} dict={dict} />
        <HistoryModeModal
          isOpen={isChangeModeOpen}
          onClose={() => setIsChangeModeOpen(false)}
          currentMode={mode}
          showIntro={false}
          completedCounts={completionStatus.completion_counts.history ?? {}}
          completedFullCounts={completionStatus.full_roster.history ?? {}}
          onSelectMode={(newMode) => {
            saveHistoryMode(newMode);
            setIsChangeModeOpen(false);
            router.push(`${pathname}?mode=${newMode}`);
          }}
          dict={dict}
        />
      </div>
    </div>
  );
};
