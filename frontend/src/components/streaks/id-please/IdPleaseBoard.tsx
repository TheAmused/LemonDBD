'use client';
// frontend/src/components/streaks/id-please/IdPleaseBoard.tsx

import React, { useState } from 'react';
import { CheckCircle2, Trophy } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Toast } from '@/components/common/Toast';
import { TOAST_DURATION_MS } from '@/constants/timing';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import { saveIdPleaseDifficulty } from '@/utils/streakDifficultyPrefs';
import { ID_PLEASE_MODE_BY_LANE, idPleaseLaneForRole, idPleaseLaneSide, parseIdPleaseDifficulty } from '@/types/idPleaseStreak';
import type { IdPleaseNotice } from './useIdPleaseRun';
import { ChallengeErrorBanner, ChallengePanel } from '../ChallengePanel';
import {
  AbandonConfirmModal,
  ChallengeCompletionHistoryDrawer,
  CheckpointCelebrationModal,
  Confetti,
} from '../lazyChallengeParts';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';
import { useCelebrateOnRise, useCelebration } from '../useCelebration';
import { useChallengeCompletionStatus } from '../useChallengeCompletionStatus';
import { idPleaseNeeds } from './idPleaseNeeds';
import { IdPleaseHeader } from './IdPleaseHeader';
import { IdPleaseMatchCard } from './IdPleaseMatchCard';
import { IdPleaseProgress } from './IdPleaseProgress';
import { IdPleaseSetup } from './IdPleaseSetup';
import { useIdPleaseEligibility } from './useIdPleaseEligibility';
import { useIdPleaseRun } from './useIdPleaseRun';

// Opened on demand, like the other challenge boards: none of them is needed to start playing.
const IdPleaseStatsDrawer = dynamic(() => import('./IdPleaseStatsDrawer').then((m) => m.IdPleaseStatsDrawer), { ssr: false });
const IdPleaseRulesModal = dynamic(() => import('./IdPleaseRulesModal').then((m) => m.IdPleaseRulesModal), { ssr: false });
const IdPleaseModeModal = dynamic(() => import('./IdPleaseModeModal').then((m) => m.IdPleaseModeModal), { ssr: false });

interface IdPleaseBoardProps {
  /** killer, survivor or challenge: each tab is its own lane. Killer and Survivor stay on their side, the combined tab alternates. */
  role: string;
}

export const IdPleaseBoard: React.FC<IdPleaseBoardProps> = ({ role }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const router = useRouter();
  const pathname = usePathname();
  const difficulty = parseIdPleaseDifficulty(useSearchParams().get('difficulty'));
  const lane = idPleaseLaneForRole(role);
  const laneSide = idPleaseLaneSide(lane);
  const completionStatus = useChallengeCompletionStatus();
  // Only the mode picker needs it, so it is asked for when the picker opens.
  const [isChangeModeOpen, setIsChangeModeOpen] = useState(false);
  const eligibility = useIdPleaseEligibility(lane, isChangeModeOpen);
  const {
    run,
    stats,
    completions,
    loading,
    busy,
    error,
    notice,
    submitOpening,
    submitResult,
    abandon,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
    justEarnedBadge,
    dismissBadge,
  } = useIdPleaseRun(lane, difficulty);
  const { celebrating, celebrate } = useCelebration();
  useCelebrateOnRise(justEarnedBadge || justBankedCheckpoint != null, celebrate);

  const [confirmingAbandon, setConfirmingAbandon] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const match = run?.match ?? null;
  const side = laneSide ?? match?.side ?? 'survivor';
  const locked = run !== null && !run.eligibility.met;
  const inSetup = run !== null && run.current_match === 0;

  const noticeText: Record<IdPleaseNotice, string> = {
    roster_changed: s.idPleaseRosterChanged,
    roster_below_minimum: s.idPleaseRosterBelowMin,
    stale_match: s.idPleaseStaleMatch,
  };

  const handleAbandon = () => {
    setConfirmingAbandon(false);
    void abandon();
  };

  return (
    <div className="pb-16">
      <Confetti active={celebrating} />

      {error && <ChallengeErrorBanner message={error} />}
      {notice && (
        <output className="mb-4 block rounded-card border border-accent-amber/40 bg-accent-amber/10 p-3 text-sm text-accent-amber">
          {noticeText[notice]}
        </output>
      )}

      <ChallengePanel
        progress={
          run?.badge_progress ? (
            <IdPleaseProgress unit={run.badge_streak === null ? 'characters' : 'wins'} progress={run.badge_progress} checkpointInterval={run.checkpoint_interval} />
          ) : null
        }
        header={
          <IdPleaseHeader
            difficulty={difficulty}
            side={side}
            streak={run?.current_streak ?? 0}
            best={run?.best_streak ?? 0}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenStats={() => setIsStatsOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenAbandon={() => setConfirmingAbandon(true)}
            onChangeMode={() => setIsChangeModeOpen(true)}
          />
        }
      >
        {loading || !run ? (
          <p className="py-10 text-center text-sm text-text-muted">{dict.app.loading}</p>
        ) : locked ? (
          <div className="py-4 text-center">
            <h2 className="type-card-title text-text-primary">{s.idPleaseLockedTitle}</h2>
            <p className="mt-1 text-sm text-text-secondary">{s.idPleaseLockedText}</p>
            <ul className="mt-3 space-y-1 text-sm text-accent-amber">
              {idPleaseNeeds(s, run.eligibility).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : inSetup ? (
          <IdPleaseSetup
            key={`${run.id}-${run.attempt}`}
            lane={lane}
            difficulty={difficulty}
            startSide={role === 'killer' ? 'killer' : 'survivor'}
            fingerprint={run.roster_fingerprint}
            busy={busy}
            onStart={(chosenSide, positions) => {
              void submitOpening(chosenSide, positions);
            }}
          />
        ) : (
          match && (
            <div className="space-y-3">
              <IdPleaseMatchCard match={match} />
              <p className="text-center text-xs text-text-muted">{s.idPleaseRosterLive}</p>
              {run.checkpoint_interval > 0 && (
                <p className="text-center text-xs text-text-muted">
                  {formatMessage(s.idPleaseNextCheckpoint, {
                    wins: (Math.floor(run.current_streak / run.checkpoint_interval) + 1) * run.checkpoint_interval,
                  })}
                  {run.checkpoint && ` ${formatMessage(s.idPleaseCheckpointNote, { number: run.checkpoint.number })}`}
                </p>
              )}
              {run.badge_earned && (
                <p className="flex items-center justify-center gap-1 type-strong text-accent-amber">
                  <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                  {s.idPleaseBadgeEarned}
                </p>
              )}
              <StreakActionBar>
                <StreakActionButton variant="red" onClick={() => { void submitResult('loss'); }} disabled={busy}>
                  {s.loseMatch}
                </StreakActionButton>
                <StreakActionButton variant="green" onClick={() => { void submitResult('win'); }} disabled={busy}>
                  {s.winMatch}
                </StreakActionButton>
              </StreakActionBar>
            </div>
          )
        )}
      </ChallengePanel>

      {justEarnedBadge && (
        <Toast
          tone="amber"
          align="center"
          icon={<CheckCircle2 className="icon-md" aria-hidden="true" />}
          message={formatMessage(s.idPleaseBadgeToast, {
            difficulty: { milestones: s.idPleaseMilestonesLabel, hardcore: s.idPleaseHardcoreLabel, hardcore_plus: s.idPleaseHardcorePlusLabel }[difficulty],
          })}
          onDismiss={dismissBadge}
          autoDismissMs={TOAST_DURATION_MS.success}
          dismissLabel={dict.admin.close}
        />
      )}

      <AbandonConfirmModal
        open={confirmingAbandon}
        busy={busy}
        message={s.idPleaseAbandonPrompt}
        onCancel={() => setConfirmingAbandon(false)}
        onConfirm={handleAbandon}
      />
      <IdPleaseStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} attempts={run ? run.attempts + 1 : undefined} />
      <ChallengeCompletionHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        completions={completions}
        subjectLabel={s.idPleaseCharactersSubject}
      />
      <IdPleaseRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} lane={lane} difficulty={difficulty} />
      <IdPleaseModeModal
        isOpen={isChangeModeOpen}
        onClose={() => setIsChangeModeOpen(false)}
        currentDifficulty={difficulty}
        lane={lane}
        side={side}
        eligibility={eligibility}
        completedVariants={completionStatus.completions[ID_PLEASE_MODE_BY_LANE[lane]] ?? []}
        onSelectDifficulty={(next) => {
          saveIdPleaseDifficulty(lane, next);
          setIsChangeModeOpen(false);
          router.push(`${pathname}?difficulty=${next}`);
        }}
      />
      <CheckpointCelebrationModal checkpoint={justBankedCheckpoint} onClose={dismissCheckpointCelebration} />
    </div>
  );
};
