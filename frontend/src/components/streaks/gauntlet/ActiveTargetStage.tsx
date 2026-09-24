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
  Star,
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
        className={`w-full h-full bg-bg-elevated rounded-xl flex items-center justify-center text-text-muted ${motion}`}
      >
        {role === 'survivor' ? <User className="w-8 h-8" aria-hidden="true" /> : <KillerIcon className="w-8 h-8" aria-hidden="true" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`w-full h-full max-w-none object-cover rounded-xl ${motion}`}
      onError={() => setFailed(true)}
    />
  );
};

const PerkArt: React.FC<{ perk: Perk; size: string }> = ({ perk, size }) => {
  const [failed, setFailed] = useState<boolean>(false);
  const displayName = usePerkDisplayName()(perk.name);
  const src = perkIconFor(perk);

  if (!src || failed) {
    return (
      <div className={`${size} flex items-center justify-center text-text-muted`}>
        <Sparkles className="w-1/2 h-1/2" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={displayName}
      className={`${size} max-w-none object-contain`}
      onError={() => setFailed(true)}
    />
  );
};

type SlotSize = 'large' | 'small' | 'compact';

const SLOT_ICON_BASE: Record<SlotSize, string> = {
  large: 'w-20 h-20',
  small: 'w-16 h-16',
  compact: 'w-12 h-12',
};

const slotIconBase = (size: SlotSize) =>
  `${SLOT_ICON_BASE[size]} shrink-0 rounded-md rotate-45 flex items-center justify-center border relative`;

const BADGE_TEXT_SIZE: Record<SlotSize, string> = {
  large: 'text-[9.5px]',
  small: 'text-[9.5px]',
  compact: 'text-[7px]',
};

const BADGE_BG: Record<'amber' | 'red', string> = {
  amber: 'bg-accent-amber',
  red: 'bg-accent-red',
};

const SlotChip: React.FC<{
  iconClassName: string;
  caption: string;
  title?: string;
  size: SlotSize;
  badge?: string;
  badgeColor?: 'amber' | 'red';
  children: React.ReactNode;
}> = ({ iconClassName, caption, title, size, badge, badgeColor = 'amber', children }) => (
  <div className="relative inline-flex shrink-0" title={title || caption}>
    {badge && (
      <div
        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 ${BADGE_BG[badgeColor]} text-text-primary ${BADGE_TEXT_SIZE[size]} font-black uppercase tracking-wide px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap`}
      >
        {badge}
      </div>
    )}
    <div className={`${slotIconBase(size)} ${iconClassName}`}>
      <div className="-rotate-45 flex items-center justify-center">{children}</div>
    </div>
  </div>
);

const SLOT_ICON_SIZE: Record<SlotSize, string> = {
  large: 'w-8 h-8',
  small: 'w-6 h-6',
  compact: 'w-4 h-4',
};

const TEACHABLE_ACCENT = {
  amber: 'bg-accent-amber/10 border-accent-amber/40 text-accent-amber',
  red: 'bg-accent-red/10 border-accent-red/40 text-accent-red',
};

/** The "own unique perk goes here" slot, always paired with its badge.
 * `accent` lets squad color each player's slot differently. */
const TeachableSlot: React.FC<{ size: SlotSize; title: string; accent?: 'amber' | 'red'; dict?: Dictionary }> = ({
  size,
  title,
  accent = 'amber',
  dict,
}) => (
  <SlotChip
    size={size}
    iconClassName={TEACHABLE_ACCENT[accent]}
    caption={(dict?.streaks?.ownPerkOf || 'Own perk').replace(/:$/, '')}
    title={title}
    badge={dict?.streaks?.teachableBadge || 'Teachable'}
    badgeColor={accent}
  >
    <Star className={SLOT_ICON_SIZE[size]} />
  </SlotChip>
);

interface PerkSlotsRowProps {
  tierInfo: TierInfo;
  charPerks: Perk[];
  randomPerks: Perk[];
  displayName: string;
  size?: SlotSize;
  teachableAccent?: 'amber' | 'red';
  dict?: Dictionary;
}

/** A single horizontal row of labelled slot chips. */
const PerkSlotsRow: React.FC<PerkSlotsRowProps> = ({ tierInfo, charPerks, randomPerks, displayName, size = 'small', teachableAccent, dict }) => {
  const perkLimit = tierInfo.perk_limit;
  const charactersPerksOnly = tierInfo.character_perks_only;
  const slots = [0, 1, 2, 3];
  const slotLabel = dict?.streaks?.slotLabel || 'Slot';
  const perkDisplayName = usePerkDisplayName();
  const large = size === 'large';
  const iconSize = SLOT_ICON_SIZE[size];
  const perkArtSize = large ? 'w-32 h-32' : size === 'compact' ? 'w-14 h-14' : 'w-20 h-20';

  return (
    <div>
      {charactersPerksOnly && perkLimit === 0 && (
        <p className="mb-1.5 text-[11px] text-text-secondary">
          {dict?.streaks?.noPerksThisTrial || 'No perks this trial.'} {displayName}{' '}
          {dict?.streaks?.goesInBare || 'goes in bare.'}
        </p>
      )}
      <div className={large ? 'flex items-center gap-16' : size === 'compact' ? 'flex items-center gap-6' : 'flex items-center gap-10'} role="list">
        {slots.map((idx) => {
          if (idx === 0 && perkLimit === 0 && randomPerks.length > 0) {
            const perk = randomPerks[0];
            return (
              <SlotChip
                key="random-perk"
                size={size}
                iconClassName="border-transparent"
                caption={perkDisplayName(perk.name)}
                title={perkDisplayName(perk.name)}
              >
                <PerkArt perk={perk} size={perkArtSize} />
              </SlotChip>
            );
          }

          if (idx >= perkLimit) {
            return (
              <SlotChip
                key={`locked-${idx}`}
                size={size}
                iconClassName="bg-bg-elevated/60 border-dashed border-border-color opacity-60 text-text-muted"
                caption={dict?.streaks?.lockedSuffix ? dict.streaks.lockedSuffix[0].toUpperCase() + dict.streaks.lockedSuffix.slice(1) : 'Locked'}
                title={`${slotLabel} ${idx + 1} ${dict?.streaks?.lockedSuffix || 'locked'} — ${dict?.streaks?.tierLabel || 'Tier'} ${tierInfo.tier_level} ${dict?.streaks?.ruleSuffix || 'rule'}`}
              >
                <Lock className={iconSize} />
              </SlotChip>
            );
          }

          if (charactersPerksOnly) {
            // Every filled slot is one of the killer's own teachables, not a free pick.
            const ownPerk = charPerks[idx];
            return (
              <SlotChip
                key={`char-slot-${idx}`}
                size={size}
                iconClassName={ownPerk ? 'border-transparent' : 'bg-accent-red/10 border-accent-red/40 text-accent-red'}
                caption={ownPerk ? perkDisplayName(ownPerk.name) : (dict?.streaks?.ownPerkOf || 'Own perk').replace(/:$/, '')}
              >
                {ownPerk ? <PerkArt perk={ownPerk} size={perkArtSize} /> : <HelpCircle className={iconSize} />}
              </SlotChip>
            );
          }

          if (idx === 0) {
            // One of several choices, not a specific assigned perk -- a symbol
            // for "your character's own unique perk goes here", not a preview.
            const title =
              charPerks.length > 0
                ? `${dict?.streaks?.slotOneOfThese || 'One of these'}: ${charPerks
                    .map((p) => perkDisplayName(p.name))
                    .join(', ')}`
                : dict?.streaks?.noTeachablePerks || 'No teachable perks on record for this character.';
            return <TeachableSlot key="character-slot" size={size} title={title} accent={teachableAccent} dict={dict} />;
          }

          return (
            <SlotChip
              key={`free-${idx}`}
              size={size}
              iconClassName="bg-bg-elevated border-border-color text-text-muted"
              caption={dict?.streaks?.freePickCaption || 'Free pick'}
            >
              <HelpCircle className={iconSize} />
            </SlotChip>
          );
        })}
      </div>
    </div>
  );
};

interface CompactPlayerBuildProps {
  index: number;
  player: GauntletPlayerLoadout;
  role: Role;
  characters: OwnedCharacterItem[];
  tierInfo: TierInfo;
  playersPerCharacter: number;
  isTeam: boolean;
  dict?: Dictionary;
}

const CompactPlayerBuild: React.FC<CompactPlayerBuildProps> = ({
  index,
  player,
  role,
  characters,
  tierInfo,
  playersPerCharacter,
  isTeam,
  dict,
}) => {
  const displayName = useCharacterDisplayName()(player.character);
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const avatarSrc = avatarUrlFor(player.character, role, characters);
  const shared = playersPerCharacter > 1;
  const playerLabel = dict?.streaks?.playerLabel || 'Player';

  const avatarBox = (sizeClass: string, iconClass: string) => (
    <div
      title={displayName}
      className={`${sizeClass} shrink-0 rounded-xl bg-bg-elevated border-2 border-border-color flex items-center justify-center overflow-hidden`}
    >
      {avatarSrc && !avatarError ? (
        <img
          src={avatarSrc}
          alt={displayName}
          className="w-full h-full max-w-none object-cover"
          onError={() => setAvatarError(true)}
        />
      ) : (
        <div className="w-full h-full bg-bg-elevated flex items-center justify-center text-text-muted">
          {role === 'survivor' ? <User className={iconClass} aria-hidden="true" /> : <KillerIcon className={iconClass} aria-hidden="true" />}
        </div>
      )}
    </div>
  );

  if (!isTeam) {
    return (
      <div className="flex w-full items-center gap-8">
        <div className="w-1/3 shrink-0 flex flex-col items-center gap-3 border-r border-border-color pr-8">
          {avatarBox('w-28 h-28 sm:w-36 sm:h-36', 'w-14 h-14')}
          <span className="text-base font-bold text-text-primary text-center leading-tight">{displayName}</span>
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <PerkSlotsRow
            tierInfo={tierInfo}
            charPerks={player.character_perks ?? []}
            randomPerks={player.random_perks ?? []}
            displayName={displayName}
            size="large"
            dict={dict}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-4 px-3 sm:px-4 min-h-[178px]">
      <div className="w-1/3 shrink-0 flex flex-col items-center gap-2 border-r border-border-color pr-4">
        {avatarBox('w-20 h-20 sm:w-24 sm:h-24', 'w-10 h-10')}
        <span className="text-xs font-bold text-text-primary text-center leading-tight">{displayName}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-9">
        {Array.from({ length: playersPerCharacter }, (_, n) => (
          <div key={n} className="flex items-center gap-4">
            {shared && (
              <span className="w-14 shrink-0 text-[9px] uppercase font-black text-accent-red tracking-wider">
                {playerLabel} {index * playersPerCharacter + n + 1}
              </span>
            )}
            <PerkSlotsRow
              tierInfo={tierInfo}
              charPerks={player.character_perks ?? []}
              randomPerks={player.random_perks ?? []}
              displayName={displayName}
              size={shared ? 'compact' : 'small'}
              teachableAccent={shared ? (n === 0 ? 'amber' : 'red') : undefined}
              dict={dict}
            />
          </div>
        ))}
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
      <div className="w-full bg-bg-surface border border-border-color rounded-2xl p-6 text-center backdrop-blur-md mb-4">
        <div className="animate-spin text-accent-red mx-auto w-6 h-6 mb-2 flex items-center justify-center">
          <RefreshCw className="w-6 h-6" />
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
        <div className="w-full flex items-center justify-center bg-bg-surface border border-border-color rounded-xl px-4 py-[92px] shadow-sm backdrop-blur-md mb-4">
          <h2 className="text-sm sm:text-base font-black text-text-primary">
            {dict?.streaks?.soloPickTitle || 'Choose your survivor'}
          </h2>
        </div>
        <StreakActionBar>
          <StreakActionButton variant="red" compact onClick={() => onAcceptPick?.()} disabled={loading || !pendingPick}>
            {dict?.streaks?.acceptPick || 'ACCEPT PICK'}
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
        className="bg-accent-red hover:bg-accent-red-hover disabled:opacity-60 text-text-inverted font-extrabold text-sm py-2.5 px-6 rounded-xl shadow-sm transition-all cursor-pointer"
      >
        {dict?.streaks?.startGame || 'START GAME'}
      </button>
    );

    if (!isTeam && !drawing) {
      return (
        <div className="w-full flex items-center justify-center bg-bg-surface border border-border-color rounded-xl px-4 sm:px-6 py-6 shadow-sm backdrop-blur-md mb-4">
          {startButton}
        </div>
      );
    }

    if (!isTeam && drawing) {
      const reel = reels[0];
      const displayPhase = reel.phase === 'idle' ? 'landed' : reel.phase;
      return (
        <div className="w-full flex items-center justify-center gap-3 bg-bg-surface border border-border-color rounded-xl px-4 sm:px-6 py-4 shadow-sm backdrop-blur-md mb-4">
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-xl p-1 bg-bg-elevated border-2 border-border-color flex items-center justify-center overflow-hidden ${
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
      <div className="w-full flex flex-wrap items-center gap-4 bg-bg-surface border border-border-color rounded-xl px-4 sm:px-6 py-6 shadow-sm backdrop-blur-md mb-4 min-h-[210px]">
        <div className="flex-1 flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-24">
          {reels.map((reel, idx) => {
            // A reel that finished before its partner reverts to 'idle' on its own;
            // while the pair is still drawing overall, treat that as still landed.
            const displayPhase = drawing && reel.phase === 'idle' ? 'landed' : reel.phase;
            return (
              <div
                key={idx}
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-xl p-1 bg-bg-elevated border-2 border-border-color flex items-center justify-center overflow-hidden ${
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
            );
          })}
        </div>

        {!drawing && (
          <div className="text-sm sm:text-base font-black text-text-primary">
            {dict?.streaks?.readyForGauntlet || 'Ready for the Gauntlet?'}
          </div>
        )}
        </div>

        {!drawing && startButton}
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
      <StreakActionButton variant="green" compact onClick={onWin} disabled={loading}>
        {dict?.streaks?.winMatch || 'WON'}
      </StreakActionButton>
      <StreakActionButton variant="red" compact onClick={onLoss} disabled={loading}>
        {dict?.streaks?.loseMatch || 'LOST'}
      </StreakActionButton>
    </StreakActionBar>
  );

  const players: GauntletPlayerLoadout[] = isTeam
    ? teamPlayers
    : [{ character: targetName, character_perks: loadout.character_perks, random_perks: loadout.random_perks }];

  return (
    <>
      <div className="w-full bg-bg-surface border border-border-color rounded-2xl p-4 shadow-sm dark:shadow-2xl backdrop-blur-md mb-4">
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
              dict={dict}
            />
          ))}
        </div>
      </div>
      {actionButtons}
    </>
  );
};
