'use client';
// frontend/src/components/streaks/gauntlet/GauntletBoard.tsx
import type { Dictionary } from '@/locales/types';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { DEFAULT_GAUNTLET_GAME_MODE, GauntletGameMode, PICK_CHARACTER_MODES, Role } from '@/types/gauntletStreak';
import { CONFETTI_LIFETIME_MS } from '../Confetti';
import { useGauntletRun } from './useGauntletRun';
import { useOwnedCharacters, OwnedCharacterItem } from './useOwnedCharacters';
import { sortByReleaseNumber } from '@/utils/characterUtils';
import { GauntletHeader } from './GauntletHeader';
import { ActiveTargetStage } from './ActiveTargetStage';
import { CharacterRosterGrid } from './CharacterRosterGrid';
import { useStreaksDict } from '@/context/StreaksDictContext';
import { useChallengeCompletionStatus } from '../useChallengeCompletionStatus';
import { saveGauntletMode } from '@/utils/streakDifficultyPrefs';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

const Confetti = dynamic(() => import('../Confetti').then((m) => m.Confetti), { ssr: false });
const ResetConfirmModal = dynamic(
  () => import('../ResetConfirmModal').then((m) => m.ResetConfirmModal),
  { ssr: false }
);
const GauntletStatsDrawer = dynamic(
  () => import('./GauntletStatsDrawer').then((m) => m.GauntletStatsDrawer),
  { ssr: false }
);
const ChallengeCompletionHistoryDrawer = dynamic(
  () => import('../ChallengeCompletionHistoryDrawer').then((m) => m.ChallengeCompletionHistoryDrawer),
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
const CheckpointModal = dynamic(
  () => import('./CheckpointModal').then((m) => m.CheckpointModal),
  { ssr: false }
);

// Particle/Lottie code is heavy and only ever needed on this page, so it gets
// its own chunk rather than riding along in every route that imports GauntletBoard.
const GauntletFireBackground = dynamic(
  () => import('./GauntletFireBackground').then((mod) => mod.GauntletFireBackground),
  { ssr: false }
);

function gameModeLabel(mode: GauntletGameMode, dict?: Dictionary['streaks']): string {
  switch (mode) {
    case 'lemon_solo':
      return dict?.lemonSolo || 'Solo';
    case 'lemon_duo':
      return dict?.lemonDuo || 'Duo';
    case 'lemon_squad':
      return dict?.lemonSquad || 'Squad';
    default:
      return dict?.original || 'Original';
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
  const dict = useStreaksDict();
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
  const [celebrating, setCelebrating] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  // The target the reel has actually finished landing on, kept separate from
  // run.current_character_id so the roster grid can't out-race the animation.
  const [shownTarget, setShownTarget] = useState<string | null>(null);

  // Fire once when the run flips to completed, not on every later render or reload.
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

  // Rides along with the checkpoint modal. Kept for the same duration as the
  // win celebration below so the burst finishes its fall instead of being
  // unmounted mid-flight.
  useEffect(() => {
    if (justBankedCheckpoint == null) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [justBankedCheckpoint]);

  const isCompleted = run?.status === 'completed';
  const pickCharacter = PICK_CHARACTER_MODES.includes(gameMode);
  const activeCharacterIds =
    isCompleted || !shownTarget
      ? []
      : run?.current_loadout?.players?.map((player) => player.character) ?? [shownTarget];
  const awaitingPick = pickCharacter && Boolean(run) && !run?.target_revealed && !isCompleted;

  useEffect(() => {
    if (!awaitingPick) setPendingPick(null);
  }, [awaitingPick]);

  return (
    <div className="pb-24">
      <GauntletFireBackground tierLevel={isCompleted ? 0 : run?.tier_info?.tier_level ?? 0} />
      <Confetti active={celebrating} />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/${locale}/streaks/${role}`}
          className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-text-secondary hover:text-accent-red transition-colors focus:outline-none focus:ring-2 focus:ring-accent-red"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="capitalize">
            {dict?.streaks?.backToLabel || 'Back to'} {role} {dict?.streaks?.streaksSuffix || 'streaks'}
          </span>
        </Link>
        {gameMode !== 'original' && (
          <span className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-amber">
            {gameModeLabel(gameMode, dict?.streaks)}
          </span>
        )}
      </div>

      <div className="mt-4">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-accent-red/15 border border-accent-red/40 text-accent-red text-sm flex items-center justify-between shadow-xs">
            <span>{error}</span>
          </div>
        )}

        <GauntletHeader
          role={role}
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          lastCheckpointStreak={run?.last_checkpoint_streak || 0}
          poolFrozen={Boolean(run?.pool_frozen) && Boolean(run?.target_revealed)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
          onChangeMode={role === 'survivor' ? () => setIsChangeModeOpen(true) : undefined}
          dict={dict}
        />

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-accent-green/40 bg-gradient-to-b from-accent-green/10 to-accent-green/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-accent-green bg-accent-green/15 text-accent-green">
              <AdeptBadgeIcon className="h-8 w-8" />
            </div>
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-accent-green">
              {dict?.streaks?.victoryCongrats || 'Congratulations'}
            </p>
            <h2 className="text-2xl font-black tracking-tight text-text-primary">
              {dict?.streaks?.gauntletComplete || 'You won the Gauntlet Streak'}
            </h2>
            <button
              onClick={reset}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-green px-6 py-3 text-sm font-extrabold text-text-inverted shadow-xs transition-colors hover:bg-accent-green-hover disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              {dict?.streaks?.startNewRun || 'Start a new run'}
            </button>
          </div>
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
            dict={dict}
          />
        )}

        <CharacterRosterGrid
          role={role}
          characters={rosterCharacters}
          completedCharacters={run?.completed_characters || []}
          checkpointCharacters={run?.checkpoint_characters || []}
          activeCharacterIds={activeCharacterIds}
          onSelectCharacter={awaitingPick && !busy ? setPendingPick : undefined}
          selectedCharacterId={pendingPick}
          loading={loadingRoster}
          dict={dict}
        />

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message={`${dict?.streaks?.resetConfirmPrefix || 'Streak, checkpoints and every cleared'} ${dict?.streaks?.[role] || role} ${dict?.streaks?.resetConfirmSuffix || 'go back to zero. This cannot be undone.'}`}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            setConfirmingReset(false);
            reset();
          }}
          dict={dict}
        />

        <GauntletStatsDrawer
          isOpen={isStatsOpen}
          onClose={() => setIsStatsOpen(false)}
          stats={stats}
          attempts={run?.attempts}
          dict={dict}
        />
        <ChallengeCompletionHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title={dict?.streaks?.gauntlet || 'Gauntlet'}
          accent="amber"
          completions={completions}
          subjectLabel={
            role === 'killer'
              ? dict?.streaks?.killersLabel || 'killers'
              : dict?.streaks?.survivorsLabel || 'survivors'
          }
          dict={dict}
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
          dict={dict}
        />
        <GauntletRulesModal
          isOpen={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
          role={role}
          gameMode={gameMode}
          dict={dict}
        />
        <CheckpointModal
          checkpoint={justBankedCheckpoint}
          role={role}
          onClose={dismissCheckpointCelebration}
          dict={dict}
        />
      </div>
    </div>
  );
};
