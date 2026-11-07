'use client';
// frontend/src/components/streaks/history/HistoryBoard.tsx


import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { HistoryMode } from '@/types/historyStreak';
import { useHistoryRun } from './useHistoryRun';
import { useKillerPerkPool } from '../chaos/useKillerPerkPool';
import { KillerPickerGrid } from '../chaos/KillerPickerGrid';
import { ChallengeErrorBanner, ChallengePanel, ChallengeVictoryCard } from '../ChallengePanel';
import { ChallengeProgress } from '../ChallengeProgress';
import { everyNthCheckpoint } from '@/utils/challengeCheckpoints';
import { ChallengeCompletionHistoryDrawer, Confetti, AbandonConfirmModal } from '../lazyChallengeParts';
import { useCelebration } from '../useCelebration';
import { HistoryHeader } from './HistoryHeader';
import { HistoryPerkPoolPanel } from './HistoryPerkPoolPanel';
import { HistoryNextRowPreview } from './HistoryNextRowPreview';
import { HistoryRowClearedBanner } from './HistoryRowClearedBanner';
import type { Perk } from '@/types/gauntletStreak';
import { saveHistoryMode } from '@/utils/streakDifficultyPrefs';
import { useStoredItem } from '@/hooks/useStoredItem';
import {
  EMPTY_HISTORY_PICK,
  historyPickStorageKey,
  readHistoryPick,
  serializeHistoryPick,
  type HistoryPick,
} from '@/utils/historyPick';
import { attemptsStarted } from '@/utils/challengeAttempts';
import { useDictionary } from '@/context/DictionaryContext';
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
  const dict = useDictionary();
  const completionStatus = useChallengeCompletionStatus();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const mode = (searchParams.get('mode') as HistoryMode) || 'hell';

  const { run, stats, completions, loading, busy, error, submitResult, abandon } = useHistoryRun(mode);
  const { pool: perkPool } = useKillerPerkPool();

  // The pick lives in localStorage, so a refresh keeps it. It is only used for the row of the run it was made on.
  const [savedPick, savePick] = useStoredItem(historyPickStorageKey(mode));
  const pickKey = run ? `${run.id}-${run.attempts}-${run.current_row_index}-${run.total_killers_beaten}` : '';
  const { selected: selectedKillerId, accepted: acceptedKillerId } = readHistoryPick(savedPick, pickKey, run?.current_row_killers ?? []);
  const updatePick = (next: HistoryPick) => savePick(serializeHistoryPick(pickKey, next));
  const { celebrating, celebrate } = useCelebration();
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [perkModal, setPerkModal] = useState<{ killerName: string; perks: Perk[] } | null>(null);
  const [rowClearedNumber, setRowClearedNumber] = useState<number | null>(null);
  const [isChangeModeOpen, setIsChangeModeOpen] = useState(false);

  const isCompleted = run?.status === 'completed';

  // The server creates a run with its killer pool already stored, so pool_frozen is true from the start. The pool only
  // counts as frozen once something was played in the run (an untouched run still follows the live roster, see
  // HistoryService._is_untouched). Read from the run itself, so every mode and a page reload agree.
  const hasProgress = Boolean(run) && (run!.total_killers_beaten > 0 || run!.current_row_index > 0 || run!.completed_killers.length > 0);
  const poolFrozen = Boolean(run?.pool_frozen) && hasProgress;

  const clearPick = () => updatePick(EMPTY_HISTORY_PICK);

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

  const handleAbandon = () => {
    setConfirmingAbandon(false);
    clearPick();
    void abandon();
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
          onOpenAbandon={() => setConfirmingAbandon(true)}
          onChangeMode={() => setIsChangeModeOpen(true)}
        />
          }
        >

        {isCompleted ? (
          <ChallengeVictoryCard
            title={dict.streaks.historyStreakComplete}
            onRestart={() => { void abandon(); }}
            busy={busy}
          />
        ) : (
          <div>
            <h3 className="mb-3 text-center type-label text-text-secondary sm:text-left">
              {dict.streaks.pickYourKiller}
            </h3>

            <KillerPickerGrid
              killers={run?.current_row_killers || []}
              completedKillers={run?.completed_killers || []}
              selectedKillerId={acceptedKillerId ?? selectedKillerId}
              onSelect={(killerId) => updatePick({ selected: killerId, accepted: null })}
              disabled={busy || Boolean(acceptedKillerId)}
              loading={loading}
              center
            />

            {run && (
              <HistoryNextRowPreview
                killers={run.owned_killers}
                rowSize={run.row_size}
                currentRowIndex={run.current_row_index}
              />
            )}

            <StreakActionBar>
              {!acceptedKillerId ? (
                <StreakActionButton
                  variant="red"
                  onClick={() => selectedKillerId && updatePick({ selected: selectedKillerId, accepted: selectedKillerId })}
                  disabled={busy || !selectedKillerId}
                >
                  {dict.streaks.accept}
                </StreakActionButton>
              ) : (
                <>
                  <StreakActionButton variant="red" onClick={() => { void handleResult('loss'); }} disabled={busy}>
                    {dict.streaks.loseMatch}
                  </StreakActionButton>
                  <StreakActionButton variant="green" onClick={() => { void handleResult('win'); }} disabled={busy}>
                    {dict.streaks.winMatch}
                  </StreakActionButton>
                </>
              )}
            </StreakActionBar>
          </div>
        )}
        </ChallengePanel>

        {!isCompleted && run && (
          <HistoryPerkPoolPanel pool={perkPool} unlockedPerkNames={run.unlocked_perk_names || []} />
        )}

        <AbandonConfirmModal
          open={confirmingAbandon}
          busy={busy}
          onCancel={() => setConfirmingAbandon(false)}
          onConfirm={handleAbandon}
        />

        <HistoryStatsDrawer
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
          attempts={run ? attemptsStarted(run) : undefined}
        />
        <ChallengeCompletionHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          completions={completions}
          subjectLabel={dict.streaks.killersLabel}
        />
        <HistoryRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        <HistoryPerkModal
          killerName={perkModal?.killerName ?? null}
          perks={perkModal?.perks ?? []}
          locale={locale}
          onClose={() => setPerkModal(null)}
        />
        <HistoryRowClearedBanner rowNumber={rowClearedNumber} onClose={() => setRowClearedNumber(null)} />
        <HistoryModeModal
          isOpen={isChangeModeOpen}
          onClose={() => setIsChangeModeOpen(false)}
          currentMode={mode}
          completedCounts={completionStatus.completion_counts.history ?? {}}
          completedFullCounts={completionStatus.full_roster.history ?? {}}
          onSelectMode={(newMode) => {
            saveHistoryMode(newMode);
            setIsChangeModeOpen(false);
            router.push(`${pathname}?mode=${newMode}`);
          }}
        />
      </div>
    </div>
  );
};
