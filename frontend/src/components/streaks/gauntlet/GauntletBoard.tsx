'use client';
// frontend/src/components/streaks/gauntlet/GauntletBoard.tsx
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { DEFAULT_GAUNTLET_GAME_MODE, GauntletGameMode, PICK_CHARACTER_MODES, Role } from '@/types/gauntletStreak';
import { useGauntletRun } from './useGauntletRun';
import { useOwnedCharacters, OwnedCharacterItem } from './useOwnedCharacters';
import { sortByReleaseNumber } from '@/utils/characterUtils';
import { ChallengeErrorBanner, ChallengePanel, ChallengeVictoryCard } from '../ChallengePanel';
import { ChallengeProgress } from '../ChallengeProgress';
import { gauntletCheckpoints, gauntletRunLength } from '@/utils/challengeCheckpoints';
import {
  CheckpointCelebrationModal,
  ChallengeCompletionHistoryDrawer,
  Confetti,
  ResetConfirmModal,
} from '../lazyChallengeParts';
import { useCelebrateOnRise, useCelebration } from '../useCelebration';
import { GauntletHeader } from './GauntletHeader';
import { ActiveTargetStage } from './ActiveTargetStage';
import { CharacterRosterGrid } from './CharacterRosterGrid';
import { useDictionary } from '@/context/DictionaryContext';
import { useChallengeCompletionStatus } from '../useChallengeCompletionStatus';
import { saveGauntletMode } from '@/utils/streakDifficultyPrefs';

const GauntletStatsDrawer = dynamic(
  () => import('./GauntletStatsDrawer').then((m) => m.GauntletStatsDrawer),
  { ssr: false }
);
const GauntletRulesModal = dynamic(
  () => import('./GauntletRulesModal').then((m) => m.GauntletRulesModal),
  { ssr: false }
);
const GauntletModeModal = dynamic(
  () => import('./GauntletModeModal').then((m) => m.GauntletModeModal),
  { ssr: false }
);

// Particle/Lottie code is heavy and only ever needed on this page, so it gets
// its own chunk rather than riding along in every route that imports GauntletBoard.
const GauntletFireBackground = dynamic(
  () => import('./GauntletFireBackground').then((mod) => mod.GauntletFireBackground),
  { ssr: false }
);

function gameModeLabel(mode: GauntletGameMode, dict: Dictionary['streaks']): string {
  switch (mode) {
    case 'lemon_solo':
      return dict.lemonSolo;
    case 'lemon_duo':
      return dict.lemonDuo;
    case 'lemon_squad':
      return dict.lemonSquad;
    case 'lemon_hooks':
      return dict.lemonHooks;
    default:
      return dict.original;
  }
}

interface GauntletBoardProps {
  locale: string;
  role: Role;
  gameMode?: GauntletGameMode;
}

export const GauntletBoard: React.FC<GauntletBoardProps> = ({
  locale,
  role,
  gameMode = DEFAULT_GAUNTLET_GAME_MODE,
}) => {
  const dict = useDictionary();
  const router = useRouter();
  const pathname = usePathname();
  const completionStatus = useChallengeCompletionStatus();
  const {
    run,
    stats,
    completions,
    loading,
    busy,
    error,
    submitResult,
    reveal,
    chooseTarget,
    reset,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  } = useGauntletRun(role, gameMode);
  const { characters, loading: loadingRoster, releaseOrder } = useOwnedCharacters(role, run?.tier_info?.roster_limit);
  const frozenCharacters: OwnedCharacterItem[] = React.useMemo(() => {
    const owned = run?.owned_characters ?? [];
    return sortByReleaseNumber(
      owned.map((name) => ({ name, release_number: releaseOrder.get(name) ?? Infinity }))
    );
  }, [run?.owned_characters, releaseOrder]);
  const rosterCharacters = run ? frozenCharacters : characters;
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isChangeModeOpen, setIsChangeModeOpen] = useState(false);
  // Solo picks in two steps: click a character in the roster, then accept.
  const [pendingPick, setPendingPick] = useState<string | null>(null);
  const { celebrating, celebrate } = useCelebration();
  const [confirmingReset, setConfirmingReset] = useState(false);
  // The target the reel has actually finished landing on, kept separate from
  // run.current_character_id so the roster grid can't out-race the animation.
  const [shownTarget, setShownTarget] = useState<string | null>(null);

  const isCompleted = run?.status === 'completed';
  const runLength = gauntletRunLength(gameMode, run?.owned_characters?.length ?? rosterCharacters.length);
  useCelebrateOnRise(isCompleted, celebrate);
  // Rides along with the checkpoint modal.
  useCelebrateOnRise(justBankedCheckpoint != null, celebrate);
  const pickCharacter = PICK_CHARACTER_MODES.includes(gameMode);
  // Must equal the current target, not just be non-null -- otherwise a
  // stale shownTarget from the previous reveal lets the roster jump ahead
  // of the animation as soon as the next target arrives from the server.
  const currentTargetName = run?.current_character_id || run?.current_loadout?.character || '';
  const activeCharacterIds =
    isCompleted || !shownTarget || shownTarget !== currentTargetName
      ? []
      : run?.current_loadout?.players?.map((player) => player.character) ?? [shownTarget];
  const awaitingPick = pickCharacter && Boolean(run) && !run?.target_revealed && !isCompleted;

  useEffect(() => {
    if (!awaitingPick) setPendingPick(null);
  }, [awaitingPick]);

  return (
    <div className="pb-16">
      <GauntletFireBackground tierLevel={isCompleted ? 0 : run?.tier_info?.tier_level ?? 0} />
      <Confetti active={celebrating} />

      <div>
        {error && <ChallengeErrorBanner message={error} />}

        <ChallengePanel
          progress={
            <ChallengeProgress
              current={run?.current_streak ?? 0}
              total={runLength}
              checkpoints={gauntletCheckpoints(gameMode, runLength)}
            />
          }
          header={
        <GauntletHeader
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          poolFrozen={Boolean(run?.pool_frozen) && Boolean(run?.target_revealed)}
          modeLabel={gameMode !== 'original' || role === 'survivor' ? gameModeLabel(gameMode, dict.streaks) : undefined}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
          onChangeMode={() => setIsChangeModeOpen(true)}
        />
          }
        >
        {isCompleted ? (
          <ChallengeVictoryCard
            title={dict.streaks.gauntletComplete}
            onRestart={reset}
            busy={busy}
          />
        ) : (
          <ActiveTargetStage
            run={run}
            role={role}
            characters={rosterCharacters}
            loading={loading || busy}
            onWin={() => submitResult('win')}
            onLoss={() => submitResult('loss')}
            onReveal={reveal}
            pickCharacter={pickCharacter}
            pendingPick={pendingPick}
            onAcceptPick={() => {
              if (pendingPick) chooseTarget(pendingPick);
            }}
            holdReel={justBankedCheckpoint != null}
            shownTarget={shownTarget}
            onShownTargetChange={setShownTarget}
          />
        )}
        </ChallengePanel>

        <CharacterRosterGrid
          role={role}
          characters={rosterCharacters}
          completedCharacters={run?.completed_characters || []}
          checkpointCharacters={run?.checkpoint_characters || []}
          activeCharacterIds={activeCharacterIds}
          onSelectCharacter={awaitingPick && !busy ? setPendingPick : undefined}
          selectedCharacterId={pendingPick}
          loading={loadingRoster}
        />

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message={`${dict.streaks.resetConfirmPrefix} ${dict.streaks?.[role] || role} ${dict.streaks.resetConfirmSuffix}`}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            setConfirmingReset(false);
            reset();
          }}
        />

        <GauntletStatsDrawer
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
          attempts={run?.attempts}
        />
        <ChallengeCompletionHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          completions={completions}
          subjectLabel={
            role === 'killer'
              ? dict.streaks.killersLabel
              : dict.streaks.survivorsLabel
          }
        />
        <GauntletModeModal
          isOpen={isChangeModeOpen}
          onClose={() => setIsChangeModeOpen(false)}
          role={role}
          currentMode={gameMode}
          showIntro={false}
          originalCompleted={(completionStatus.completions.gauntlet ?? []).includes(`${role}_original`)}
          originalCompletedCount={completionStatus.completion_counts.gauntlet?.[`${role}_original`] ?? null}
          originalCompletedFull={completionStatus.full_roster.gauntlet?.[`${role}_original`] != null}
          originalCompletedFullCount={completionStatus.full_roster.gauntlet?.[`${role}_original`] ?? null}
          onSelectMode={(mode) => {
            saveGauntletMode(role, mode);
            setIsChangeModeOpen(false);
            router.push(mode === 'original' ? pathname : `${pathname}?mode=${mode}`);
          }}
        />
        <GauntletRulesModal
          isOpen={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
          role={role}
          gameMode={gameMode}
        />
        <CheckpointCelebrationModal checkpoint={justBankedCheckpoint} onClose={dismissCheckpointCelebration} />
      </div>
    </div>
  );
};
