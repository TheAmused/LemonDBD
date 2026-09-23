'use client';
// frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GauntletPlayerLoadout, GauntletRun, Perk, Role, TierInfo } from '@/types/gauntletStreak';
import type { OwnedCharacterItem } from './useOwnedCharacters';
import { useTargetDraw, DrawPhase } from './useTargetDraw';
import {
  RefreshCw,
  User,
  Sparkles,
  Lock,
  HelpCircle,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { avatarUrlForCharacter, perkIconUrl, staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName, usePerkDisplayName } from '@/context/DisplayNamesContext';
import { KillerIcon } from '@/components/icons/DbdIcons';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';

export const avatarUrlFor = (name: string, role: Role, characters: OwnedCharacterItem[] = []) => {
  if (!name) return null;
  const owned = characters.find((c) => c.name === name)?.avatar_local_path;
  return staticUrl(owned) || avatarUrlForCharacter(name, role === 'survivor' ? 'survivors' : 'killers') || null;
};

const perkIconFor = (perk: Perk) => perkIconUrl(perk);

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
  shownTarget: string | null;
  onShownTargetChange: (name: string | null) => void;
  dict?: Dictionary;
}

const RevealPortrait: React.FC<{ name?: string; role: Role; phase: DrawPhase; characters: OwnedCharacterItem[] }> = ({
  name,
  role,
  phase,
  characters,
}) => {
  const [failed, setFailed] = useState<boolean>(false);
  const src = name ? avatarUrlFor(name, role, characters) : null;

  useEffect(() => setFailed(false), [name]);

  const motion = phase === 'landed' ? 'gn-land-frame' : phase === 'spinning' ? 'gn-spin-frame' : '';

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-bg-elevated rounded-xl flex items-center justify-center text-accent-red ${motion}`}
      >
        {role === 'survivor' ? <User className="w-10 h-10" aria-hidden="true" /> : <KillerIcon className="w-10 h-10" aria-hidden="true" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`w-full h-full object-cover rounded-xl ${motion}`}
      onError={() => setFailed(true)}
    />
  );
};

const PerkIcon: React.FC<{ perk: Perk; size?: string }> = ({ perk, size = 'w-12 h-12' }) => {
  const [failed, setFailed] = useState<boolean>(false);
  const displayName = usePerkDisplayName()(perk.name);
  const src = perkIconFor(perk);

  return (
    <div
      title={displayName}
      className={`relative ${size} shrink-0 bg-bg-elevated border border-border-color rounded-lg flex items-center justify-center p-1 overflow-hidden`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={displayName}
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Sparkles className="w-5 h-5 text-text-muted" aria-hidden="true" />
      )}
    </div>
  );
};

const RandomPerkSlot: React.FC<{ perk: Perk }> = ({ perk }) => {
  const displayName = usePerkDisplayName()(perk.name);
  return (
    <div className="col-span-2 xl:col-span-1 bg-accent-amber/10 border border-accent-amber/40 rounded-xl p-3 flex items-center gap-3">
      <PerkIcon perk={perk} size="w-11 h-11" />
      <div className="overflow-hidden">
        <p className="text-[11px] text-text-primary mt-0.5 truncate">{displayName}</p>
      </div>
    </div>
  );
};

interface PerkSlotsGridProps {
  tierInfo: TierInfo;
  charPerks: Perk[];
  randomPerks: Perk[];
  displayName: string;
  dict?: Dictionary;
}

const SLOT_ICON_BOX =
  'w-11 h-11 shrink-0 bg-bg-elevated border border-border-color rounded-lg flex items-center justify-center text-text-muted';

const PerkSlotsGrid: React.FC<PerkSlotsGridProps> = ({ tierInfo, charPerks, randomPerks, displayName, dict }) => {
  const perkLimit = tierInfo.perk_limit;
  const charactersPerksOnly = tierInfo.character_perks_only;
  const slots = [0, 1, 2, 3];
  // Only a survivor's slot 1 holds icons, so only then does it earn a wider column.
  const wideFirstSlot = !charactersPerksOnly && (perkLimit > 0 || randomPerks.length > 0);

  return (
    <div>
      {charactersPerksOnly && perkLimit === 0 && (
        <p className="mb-2 text-xs text-text-secondary">
          {dict?.streaks?.noPerksThisTrial || 'No perks this trial.'} {displayName}{' '}
          {dict?.streaks?.goesInBare || 'goes in bare.'}
        </p>
      )}
      <div
        className={`grid grid-cols-2 gap-3 ${wideFirstSlot ? 'xl:grid-cols-[1.5fr_1fr_1fr_1fr]' : 'xl:grid-cols-4'}`}
        role="list"
      >
        {slots.map((idx) => {
          if (idx === 0 && perkLimit === 0 && randomPerks.length > 0) {
            return <RandomPerkSlot key="random-perk" perk={randomPerks[0]} />;
          }

          if (idx >= perkLimit) {
            return (
              <div
                key={`locked-${idx}`}
                className="bg-bg-elevated/60 border border-border-color border-dashed rounded-xl p-3 flex items-center gap-3 opacity-60 select-none"
              >
                <div className={SLOT_ICON_BOX} aria-hidden="true">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    {dict?.streaks?.slotLabel || 'Slot'} {idx + 1} {dict?.streaks?.lockedSuffix || 'locked'}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {dict?.streaks?.tierLabel || 'Tier'} {tierInfo.tier_level} {dict?.streaks?.ruleSuffix || 'rule'}
                  </p>
                </div>
              </div>
            );
          }

          if (charactersPerksOnly) {
            return (
              <div
                key={`char-slot-${idx}`}
                className="bg-accent-red/10 border border-accent-red/40 rounded-xl p-3 flex items-center gap-3"
              >
                <div className={`${SLOT_ICON_BOX} bg-accent-red/10 border-accent-red/30 text-accent-red`} aria-hidden="true">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-accent-red uppercase tracking-wider">
                  {dict?.streaks?.slotLabel || 'Slot'} {idx + 1}
                </h4>
              </div>
            );
          }

          if (idx === 0) {
            return (
              <div
                key="character-slot"
                className="col-span-2 xl:col-span-1 bg-accent-red/10 border border-accent-red/40 rounded-xl p-3 flex flex-col gap-2"
              >
                <h4 className="text-xs font-black text-accent-red uppercase tracking-wider">
                  {dict?.streaks?.slotOneOfThese || 'Slot 1: one of these'}
                </h4>
                {charPerks.length > 0 ? (
                  <div className="flex items-center gap-2">
                    {charPerks.map((perk, i) => (
                      <PerkIcon key={perk.id ?? i} perk={perk} size="w-11 h-11" />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">
                    {dict?.streaks?.noTeachablePerks || 'No teachable perks on record for this character.'}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div
              key={`free-${idx}`}
              className="bg-bg-surface border border-border-color rounded-xl p-3 flex items-center gap-3"
            >
              <div className={SLOT_ICON_BOX} aria-hidden="true">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                {dict?.swf?.slot || 'Slot'} {idx + 1}
              </h4>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface PlayerBuildProps {
  index: number;
  player: GauntletPlayerLoadout;
  role: Role;
  characters: OwnedCharacterItem[];
  tierInfo: TierInfo;
  /** More than one when several people play the same character (squad). */
  playersPerCharacter: number;
  /** Tag the row with its player number; only worth it when there are several. */
  showLabel: boolean;
  dict?: Dictionary;
}

/** The character on top, its perk slots underneath. */
const PlayerBuild: React.FC<PlayerBuildProps> = ({
  index,
  player,
  role,
  characters,
  tierInfo,
  playersPerCharacter,
  showLabel,
  dict,
}) => {
  const displayName = useCharacterDisplayName()(player.character);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const avatarSrc = avatarUrlFor(player.character, role, characters);
  const shared = playersPerCharacter > 1;
  const playerLabel = dict?.streaks?.playerLabel || 'Player';

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-border-color pb-5 mb-5">
        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl p-1 bg-accent-red border-2 border-accent-red flex items-center justify-center overflow-hidden">
          {avatarSrc && !avatarError ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="w-full h-full object-cover rounded-xl"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-full h-full bg-bg-elevated rounded-xl flex items-center justify-center text-accent-red">
              {role === 'survivor' ? <User className="w-10 h-10" aria-hidden="true" /> : <KillerIcon className="w-10 h-10" aria-hidden="true" />}
            </div>
          )}
        </div>
        <div className="min-w-0">
          {showLabel && !shared && (
            <span className="block text-[10px] uppercase font-black text-accent-red tracking-wider">
              {playerLabel} {index + 1}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight break-words">{displayName}</h2>
        </div>
      </div>

      {!showLabel && (
        <h3 className="mb-4 text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-red" aria-hidden="true" />
          {dict?.streaks?.yourBuildForMatch || 'Your build for this match'}
        </h3>
      )}

      <div className="flex flex-col gap-4">
        {Array.from({ length: playersPerCharacter }, (_, n) => (
          <div key={n}>
            {shared && (
              <span className="block mb-2 text-[10px] uppercase font-black text-accent-red tracking-wider">
                {playerLabel} {index * playersPerCharacter + n + 1}
              </span>
            )}
            <PerkSlotsGrid
              tierInfo={tierInfo}
              charPerks={player.character_perks ?? []}
              randomPerks={player.random_perks ?? []}
              displayName={displayName}
              dict={dict}
            />
          </div>
        ))}
        {shared && (
          <p className="text-[11px] text-text-muted">
            {dict?.streaks?.squadUniquePerkHint || "The two players on this character can't use the same unique perk."}
          </p>
        )}
      </div>
    </div>
  );
};

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
  shownTarget,
  onShownTargetChange,
  dict,
}) => {
  const characterDisplayName = useCharacterDisplayName();

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
  // A player-picked character shows up at once; there is nothing to roll.
  const skipDraw = pickCharacter;
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
      <div className="w-full bg-bg-surface border border-border-color rounded-2xl p-8 text-center backdrop-blur-md mb-8">
        <div className="animate-spin text-accent-red mx-auto w-8 h-8 mb-3 flex items-center justify-center">
          <RefreshCw className="w-8 h-8" />
        </div>
        <p className="text-text-muted text-sm">
          {dict?.streaks?.loadingStreak || 'Loading active gauntlet stage...'}
        </p>
      </div>
    );
  }

  if (pickCharacter && !run.target_revealed) {
    return (
      <>
        <div className="w-full min-h-[240px] flex flex-col items-center justify-center bg-bg-surface border border-border-color rounded-2xl px-8 py-10 text-center shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
          <div className="w-16 h-16 mb-4 rounded-2xl border border-accent-green/30 bg-accent-green/10 text-accent-green flex items-center justify-center">
            <User className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-text-primary">
            {dict?.streaks?.soloPickTitle || 'Choose your survivor'}
          </h2>
        </div>
        <StreakActionBar>
          <StreakActionButton variant="red" onClick={() => onAcceptPick?.()} disabled={loading || !pendingPick}>
            {dict?.streaks?.acceptPick || 'ACCEPT PICK'}
          </StreakActionButton>
        </StreakActionBar>
      </>
    );
  }

  if (!run.target_revealed || isDrawingAny || awaitingDraw || revealing) {
    const drawing = isDrawingAny || awaitingDraw || revealing;
    return (
      <div className="w-full min-h-[420px] flex flex-col items-center justify-center bg-bg-surface border border-border-color rounded-2xl px-8 py-4 text-center shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
        {isTeam ? (
          <div className="flex flex-row items-start justify-center gap-6 sm:gap-10 mb-6">
            {[
              { name: reelName, displayName: reelDisplayName, phase },
              { name: reelName2, displayName: reelDisplayName2, phase: phase2 },
            ].map((reel, idx) => {
              // A reel that finished before its partner reverts to 'idle' on its own;
              // while the pair is still drawing overall, treat that as still landed.
              const displayPhase = drawing && reel.phase === 'idle' ? 'landed' : reel.phase;
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1.5 bg-accent-red border-2 border-accent-red flex items-center justify-center overflow-hidden mb-3 ${
                      displayPhase === 'landed' ? 'gn-land-glow' : ''
                    }`}
                  >
                    <RevealPortrait
                      key={drawing ? reel.name ?? 'idle' : 'idle'}
                      name={drawing ? reel.name ?? undefined : undefined}
                      role={role}
                      phase={drawing ? displayPhase : 'idle'}
                      characters={characters}
                    />
                  </div>
                  {drawing && (
                    <h3 className="text-base sm:text-lg font-black text-text-primary">{reel.displayName ?? ' '}</h3>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-2xl p-1.5 bg-accent-red border-2 border-accent-red flex items-center justify-center overflow-hidden mb-6 ${
              phase === 'landed' ? 'gn-land-glow' : ''
            }`}
          >
            <RevealPortrait
              key={drawing ? reelName ?? 'idle' : 'idle'}
              name={drawing ? reelName ?? undefined : undefined}
              role={role}
              phase={drawing ? phase : 'idle'}
              characters={characters}
            />
          </div>
        )}

        {drawing ? (
          !isTeam && (
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-3">
              {reelDisplayName ?? ' '}
            </h2>
          )
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-8">
              {dict?.streaks?.readyForGauntlet || 'Ready for the Gauntlet?'}
            </h2>
            <button
              type="button"
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
              className="bg-accent-red hover:bg-accent-red-hover disabled:opacity-60 text-text-inverted font-extrabold text-lg py-4 px-10 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              {dict?.streaks?.startGame || 'START GAME'}
            </button>
          </>
        )}
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
  const actionButtons = (
    <StreakActionBar>
      <StreakActionButton variant="green" onClick={onWin} disabled={loading}>
        {dict?.streaks?.winMatch || 'WON'}
      </StreakActionButton>
      <StreakActionButton variant="red" onClick={onLoss} disabled={loading}>
        {dict?.streaks?.loseMatch || 'LOST'}
      </StreakActionButton>
    </StreakActionBar>
  );

  const players: GauntletPlayerLoadout[] = isTeam
    ? teamPlayers
    : [{ character: targetName, character_perks: loadout.character_perks, random_perks: loadout.random_perks }];

  return (
    <>
      <div className="w-full bg-bg-surface border border-border-color rounded-2xl p-6 shadow-sm dark:shadow-2xl backdrop-blur-md mb-6 space-y-5">
        {players.map((player, index) => (
          <div key={`${player.character}-${index}`} className={index > 0 ? 'border-t border-border-color pt-5' : ''}>
            <PlayerBuild
              index={index}
              player={player}
              role={role}
              characters={characters}
              tierInfo={tierInfo}
              playersPerCharacter={loadout.players_per_character ?? 1}
              showLabel={isTeam}
              dict={dict}
            />
          </div>
        ))}
      </div>
      {actionButtons}
    </>
  );
};
