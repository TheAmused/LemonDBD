'use client';
// frontend/src/components/streaks/gauntlet/GauntletBoard.tsx
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';
import React, { useState, useEffect, useRef } from 'react';
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
import { LemonTokenPanel } from './LemonTokenPanel';
import { TokenRollModal } from './TokenRollModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { formatMessage } from '@/utils/i18nFormat';
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

function gameModeLabel(mode: GauntletGameMode, dict: Dictionary['streaks']): string {
  switch (mode) {
    case 'lemon_solo':
      return dict.lemonSolo;
    case 'lemon_duo':
      return dict.lemonDuo;
    case 'lemon_squad':
      return dict.lemonSquad;
    case 'lemon_killer':
      return dict.lemonMode;
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
    buyBoost,
    devJumpToStreak,
    reset,
    tokenRoll,
    dismissTokenRoll,
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
  // Lemon killer: choosing a killer to buy, and the shield question after a loss is reported.
  const [buyingPick, setBuyingPick] = useState(false);
  const [shieldPromptOpen, setShieldPromptOpen] = useState(false);
  // The modal stays mounted while it animates out, so a second click on it must not report the loss again.
  const shieldAnswered = useRef(false);
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
  const boosts = run?.boosts ?? null;
  // TEMP DEV: the first streak of each tier, so a tier can be reached without playing up to it.
  const devStreaks = run?.dev_tools
    ? gameMode === 'lemon_duo' || gameMode === 'lemon_squad'
      ? [0, 6, 12, 18]
      : role === 'killer'
      ? [0, 10, 20, 30]
      : [0, 10, 20, 30, 40]
    : undefined;
  const matchActive = Boolean(run?.target_revealed) && !isCompleted;
  // Only worth asking when the loss would actually cost progress: at a checkpoint there is nothing to protect.
  const shieldWouldHelp = (run?.current_streak ?? 0) > (run?.last_checkpoint_streak ?? 0);
  const canAffordShield = boosts != null && (run?.tokens ?? 0) >= boosts.prices.shield && shieldWouldHelp;

  // A result, a purchase or a mode switch ends any killer purchase still being chosen.
  useEffect(() => {
    setBuyingPick(false);
  }, [run?.updated_at, gameMode]);

  useEffect(() => {
    if (!awaitingPick && !buyingPick) setPendingPick(null);
  }, [awaitingPick, buyingPick]);

  return (
    <div className="pb-16">
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
          modeLabel={gameModeLabel(gameMode, dict.streaks)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
          onChangeMode={() => setIsChangeModeOpen(true)}
          devStreaks={devStreaks}
          onDevJump={devJumpToStreak}
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
          <>
          <ActiveTargetStage
            run={run}
            role={role}
            characters={rosterCharacters}
            loading={loading || busy}
            onWin={() => submitResult('win')}
            onLoss={() => {
              // A reported loss is always sent; with the tokens for it the player is first asked about a shield.
              if (canAffordShield) {
                shieldAnswered.current = false;
                setShieldPromptOpen(true);
              } else {
                submitResult('loss');
              }
            }}
            bonusSlots={run?.bonus_perk_slots ?? 0}
            onReveal={reveal}
            pickCharacter={pickCharacter}
            pendingPick={pendingPick}
            onAcceptPick={() => {
              if (pendingPick) chooseTarget(pendingPick);
            }}
            holdReel={justBankedCheckpoint != null || tokenRoll != null}
            shownTarget={shownTarget}
            onShownTargetChange={setShownTarget}
          />
          {boosts && run && (
            <LemonTokenPanel
              boosts={boosts}
              tokens={run.tokens}
              tierInfo={run.tier_info}
              bonusSlots={run.bonus_perk_slots}
              matchActive={matchActive}
              busy={busy}
              picking={buyingPick}
              pendingPick={pendingPick}
              onStartPick={() => setBuyingPick(true)}
              onCancelPick={() => {
                setBuyingPick(false);
                setPendingPick(null);
              }}
              onConfirmPick={async () => {
                if (!pendingPick) return;
                await buyBoost('pick', pendingPick);
                setBuyingPick(false);
                setPendingPick(null);
              }}
              onBuy={(boost) => {
                buyBoost(boost);
              }}
            />
          )}
          </>
        )}
        </ChallengePanel>

        <CharacterRosterGrid
          role={role}
          characters={rosterCharacters}
          completedCharacters={run?.completed_characters || []}
          checkpointCharacters={run?.checkpoint_characters || []}
          activeCharacterIds={activeCharacterIds}
          onSelectCharacter={(awaitingPick || buyingPick) && !busy ? setPendingPick : undefined}
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
            setShieldPromptOpen(false);
            setBuyingPick(false);
            reset();
          }}
        />

        {boosts && (
          <ConfirmModal
            open={shieldPromptOpen}
            title={dict.streaks.shieldTitle}
            message={formatMessage(dict.streaks.shieldMessage, { price: boosts.prices.shield })}
            confirmLabel={dict.streaks.shieldConfirm}
            cancelLabel={dict.streaks.shieldDecline}
            busy={busy}
            onConfirm={() => {
              if (shieldAnswered.current) return;
              shieldAnswered.current = true;
              setShieldPromptOpen(false);
              submitResult('loss', true);
            }}
            onCancel={() => {
              if (shieldAnswered.current) return;
              shieldAnswered.current = true;
              setShieldPromptOpen(false);
              submitResult('loss', false);
            }}
          />
        )}

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
        <TokenRollModal tokenRoll={tokenRoll} tokens={run?.tokens ?? 0} cap={boosts?.cap ?? 0} onClose={dismissTokenRoll} />
        {/* The token roll plays first; the checkpoint celebration follows once it is closed. */}
        <CheckpointCelebrationModal
          checkpoint={tokenRoll ? null : justBankedCheckpoint}
          onClose={dismissCheckpointCelebration}
        />
      </div>
    </div>
  );
};
