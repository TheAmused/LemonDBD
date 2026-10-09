'use client';
// frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx

import { Button } from '@/components/common/Button';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GauntletPlayerLoadout, GauntletRun, Role } from '@/types/gauntletStreak';
import type { OwnedCharacterItem } from './useOwnedCharacters';
import { useTargetDraw } from './useTargetDraw';
import { staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';
import { RevealPortrait, CompactPlayerBuild } from "./ActiveTargetStageParts";
import { Spinner } from '@/components/common/Spinner';
import { useDictionary } from "@/context/DictionaryContext";
import { useChallengeAnimations } from '../useChallengeAnimations';

export interface ActiveTargetStageProps {
  run: GauntletRun | null;
  role: Role;
  characters: OwnedCharacterItem[];
  loading?: boolean;
  onWin: () => void;
  onLoss: () => void;
  onReveal: () => void;
  /** The player picks the character from the roster, so there is no draw. */
  pickCharacter?: boolean;
  /** The character clicked in the roster but not yet accepted (pick mode only). */
  pendingPick?: string | null;
  onAcceptPick?: () => void;
  holdReel?: boolean;
  /** A killer the player bought with tokens: it replaces the current one at once, with no draw. */
  instantTarget?: string | null;
  shownTarget: string | null;
  onShownTargetChange: (name: string | null) => void;
  /** Free perk slots bought with tokens for this match. */
  bonusSlots?: number;
  /** While a killer is being bought, these buttons stand in for WON and LOST. */
  buyPick?: { confirmLabel: string; cancelLabel: string; canConfirm: boolean; onConfirm: () => void; onCancel: () => void };
}

export const ActiveTargetStage: React.FC<ActiveTargetStageProps> = ({
      run,
      role,
      characters,
      loading = false,
      onWin,
      onLoss,
      onReveal,
      pickCharacter = false,
      pendingPick = null,
      onAcceptPick,
      holdReel = false,
      instantTarget = null,
      shownTarget,
      onShownTargetChange,
      bonusSlots = 0,
      buyPick,
    }) => {
  const dict = useDictionary();
  const characterDisplayName = useCharacterDisplayName();
  const [animations] = useChallengeAnimations();

  const targetName = run?.current_character_id || run?.current_loadout?.character || '';
  const completed = run?.completed_characters || [];

  // Duo/squad roll two distinct characters at once; each gets its own reel.
  const teamPlayers = run?.current_loadout?.players ?? [];
  const isTeam = teamPlayers.length > 1;
  const player1Name = teamPlayers[1]?.character || '';

  const drawPool = useMemo(() => {
    const names = characters.map((c) => c.name).filter((name) => !completed.includes(name));
    return names.includes(targetName) ? names : [...names, targetName].filter(Boolean);
  }, [characters, completed, targetName]);

  const drawPool2 = useMemo(() => {
    const names = characters.map((c) => c.name).filter((name) => !completed.includes(name));
    return names.includes(player1Name) ? names : [...names, player1Name].filter(Boolean);
  }, [characters, completed, player1Name]);

  const { displayName: reelName, phase, isDrawing, start: startDraw } = useTargetDraw(drawPool, targetName);
  const reelDisplayName = reelName != null ? characterDisplayName(reelName) : null;

  const { displayName: reelName2, phase: phase2, isDrawing: isDrawing2, start: startDraw2 } = useTargetDraw(
    drawPool2,
    player1Name
  );
  const reelDisplayName2 = reelName2 != null ? characterDisplayName(reelName2) : null;

  const isDrawingAny = isTeam ? isDrawing || isDrawing2 : isDrawing;

  const beginDraw = useCallback(
    (onDone: () => void) => {
      if (isTeam) {
        let remaining = 2;
        const onEach = () => {
          remaining -= 1;
          if (remaining === 0) onDone();
        };
        startDraw(onEach);
        startDraw2(onEach);
        return;
      }
      startDraw(onDone);
    },
    [isTeam, startDraw, startDraw2]
  );

  const isRevealed = Boolean(run?.target_revealed);
  // A player-picked character shows up at once, and so does every draw when the animations are off.
  const skipDraw = pickCharacter || !animations || (instantTarget != null && instantTarget === targetName);
  const awaitingDraw = !skipDraw && isRevealed && Boolean(targetName) && shownTarget !== targetName;

  useEffect(() => {
    if (!isRevealed || !targetName) {
      onShownTargetChange(null);
      return;
    }
    if (skipDraw) {
      if (shownTarget !== targetName) onShownTargetChange(targetName);
      return;
    }
    if (shownTarget === targetName || isDrawingAny) return;

    if (shownTarget === null) {
      onShownTargetChange(targetName);
      return;
    }

    if (holdReel) return;
    beginDraw(() => onShownTargetChange(targetName));
  }, [isRevealed, targetName, shownTarget, isDrawingAny, beginDraw, holdReel, skipDraw, onShownTargetChange]);

  const [revealing, setRevealing] = useState<boolean>(false);
  useEffect(() => {
    if (isRevealed && !isDrawingAny) setRevealing(false);
  }, [isRevealed, isDrawingAny]);

  if (!run || !run.current_loadout) {
    return (
      <div className="w-full rounded-xl p-6 text-center">
        <Spinner size="md" tone="accent" className="mx-auto mb-2" />
        <p className="text-text-muted text-sm">
          {dict.streaks.loadingStreak}
        </p>
      </div>
    );
  }

  if (pickCharacter && !run.target_revealed) {
    return (
      <>
        <div className="w-full flex items-center justify-center rounded-xl px-4 py-[92px]">
          <h2 className="text-sm sm:text-base font-black text-text-primary">
            {dict.streaks.soloPickTitle}
          </h2>
        </div>
        <StreakActionBar>
          <StreakActionButton variant="red" onClick={() => onAcceptPick?.()} disabled={loading || !pendingPick}>
            {dict.streaks.acceptPick}
          </StreakActionButton>
        </StreakActionBar>
      </>
    );
  }

  if (!run.target_revealed || isDrawingAny || awaitingDraw || revealing) {
    const drawing = isDrawingAny || awaitingDraw || revealing;
    const reels = isTeam
      ? [
          { name: reelName, displayName: reelDisplayName, phase },
          { name: reelName2, displayName: reelDisplayName2, phase: phase2 },
        ]
      : [{ name: reelName, displayName: reelDisplayName, phase }];

    const startButton = (
      <Button
        variant="primary"
        size="md"
        onClick={() => {
          if (skipDraw) {
            onShownTargetChange(targetName);
            onReveal();
            return;
          }
          setRevealing(true);
          beginDraw(() => {
            onShownTargetChange(targetName);
            onReveal();
          });
        }}
        disabled={loading}
      >
        {dict.streaks.startGame}
      </Button>
    );

    if (!drawing) {
      return (
        <div className="w-full flex items-center justify-center rounded-xl p-2 min-h-[148px] sm:min-h-[164px]">
          {startButton}
        </div>
      );
    }

    if (!isTeam) {
      const reel = reels[0];
      const displayPhase = reel.phase === 'idle' ? 'landed' : reel.phase;
      return (
        <div className="w-full flex items-center justify-center gap-3 rounded-xl p-2 min-h-[148px] sm:min-h-[164px]">
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl p-1 bg-bg-elevated border-2 border-border-color flex items-center justify-center overflow-hidden ${
                displayPhase === 'landed' ? 'gn-land-glow' : ''
              }`}
            >
              <RevealPortrait
                key={reel.name ?? 'idle'}
                name={reel.name ?? undefined}
                role={role}
                phase={displayPhase}
                characters={characters}
              />
            </div>
            <span className="text-base font-bold text-text-primary text-center leading-tight max-w-[160px] truncate">
              {reel.displayName ?? ' '}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full flex flex-wrap items-center gap-4 rounded-xl p-2 min-h-[194px]">
        <div className="flex-1 flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-24">
            {reels.map((reel, idx) => {
              // A reel that finished before its partner reverts to 'idle' on its own;
              // while the pair is still drawing overall, treat that as still landed.
              const displayPhase = reel.phase === 'idle' ? 'landed' : reel.phase;
              return (
                <div
                  key={idx}
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-xl p-1 bg-bg-elevated border-2 border-border-color flex items-center justify-center overflow-hidden ${
                    displayPhase === 'landed' ? 'gn-land-glow' : ''
                  }`}
                >
                  <RevealPortrait
                    key={reel.name ?? 'idle'}
                    name={reel.name ?? undefined}
                    role={role}
                    phase={displayPhase}
                    characters={characters}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const rawLoadout = run.current_loadout;
  const loadout = {
    ...rawLoadout,
    character_perks: rawLoadout.character_perks || [],
  };
  const tierInfo =
    run.tier_info ||
    { name: 'The Warm Up', tier_level: 0, perk_limit: 4, character_perks_only: false, description: '' };
  const actionButtons = buyPick ? (
    <StreakActionBar>
      <StreakActionButton variant="gray" onClick={buyPick.onCancel} disabled={loading}>
        {buyPick.cancelLabel}
      </StreakActionButton>
      <StreakActionButton variant="red" onClick={buyPick.onConfirm} disabled={loading || !buyPick.canConfirm}>
        {buyPick.confirmLabel}
      </StreakActionButton>
    </StreakActionBar>
  ) : (
    <StreakActionBar>
      <StreakActionButton variant="red" onClick={onLoss} disabled={loading}>
        {dict.streaks.loseMatch}
      </StreakActionButton>
      <StreakActionButton variant="green" onClick={onWin} disabled={loading}>
        {dict.streaks.winMatch}
      </StreakActionButton>
    </StreakActionBar>
  );

  const players: GauntletPlayerLoadout[] = isTeam
    ? teamPlayers
    : [{ character: targetName, character_perks: loadout.character_perks, random_perks: loadout.random_perks }];

  return (
    <>
      <div className="w-full rounded-xl p-2 min-h-[148px] sm:min-h-[164px]">
        <div className={isTeam ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-border-color' : ''}>
          {players.map((player, index) => (
            <CompactPlayerBuild
              key={`${player.character}-${index}`}
              index={index}
              player={player}
              role={role}
              characters={characters}
              tierInfo={tierInfo}
              playersPerCharacter={loadout.players_per_character ?? 1}
              isTeam={isTeam}
              bonusSlots={bonusSlots}
            />
          ))}
        </div>
      </div>
      {actionButtons}
    </>
  );
};
