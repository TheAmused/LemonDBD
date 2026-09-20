'use client';
// frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GauntletRun, Perk, Role } from '@/types/gauntletStreak';
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

export const ActiveTargetStage: React.FC<ActiveTargetStageProps> = ({
  run,
  role,
  characters,
  loading = false,
  onWin,
  onLoss,
  onReveal,
  holdReel = false,
  shownTarget,
  onShownTargetChange,
  dict,
}) => {
  const [avatarError, setAvatarError] = useState<boolean>(false);
  const characterDisplayName = useCharacterDisplayName();

  const targetName = run?.current_character_id || run?.current_loadout?.character || '';
  const targetDisplayName = characterDisplayName(targetName);
  const completed = run?.completed_characters || [];

  const drawPool = useMemo(() => {
    const names = characters.map((c) => c.name).filter((name) => !completed.includes(name));
    return names.includes(targetName) ? names : [...names, targetName].filter(Boolean);
  }, [characters, completed, targetName]);

  const { displayName: reelName, phase, isDrawing, start: startDraw } = useTargetDraw(drawPool, targetName);
  const reelDisplayName = reelName != null ? characterDisplayName(reelName) : null;

  const beginDraw = useCallback(
    (onDone: () => void) => {
      startDraw(onDone);
    },
    [startDraw]
  );

  const isRevealed = Boolean(run?.target_revealed);
  const awaitingDraw = isRevealed && Boolean(targetName) && shownTarget !== targetName;

  useEffect(() => {
    if (!isRevealed || !targetName) {
      onShownTargetChange(null);
      return;
    }
    if (shownTarget === targetName || isDrawing) return;

    if (shownTarget === null) {
      onShownTargetChange(targetName);
      return;
    }

    if (holdReel) return;
    beginDraw(() => onShownTargetChange(targetName));
  }, [isRevealed, targetName, shownTarget, isDrawing, beginDraw, holdReel, onShownTargetChange]);

  const [revealing, setRevealing] = useState<boolean>(false);
  useEffect(() => {
    if (isRevealed && !isDrawing) setRevealing(false);
  }, [isRevealed, isDrawing]);

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

  if (!run.target_revealed || isDrawing || awaitingDraw || revealing) {
    const drawing = isDrawing || awaitingDraw || revealing;
    return (
      <div className="w-full min-h-[420px] flex flex-col items-center justify-center bg-bg-surface border border-border-color rounded-2xl px-8 py-4 text-center shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
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

        {drawing ? (
          <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-3">
            {reelDisplayName ?? ' '}
          </h2>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-8">
              {dict?.streaks?.readyForGauntlet || 'Ready for the Gauntlet?'}
            </h2>
            <button
              type="button"
              onClick={() => {
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
  const perkLimit = tierInfo.perk_limit;
  const charactersPerksOnly = tierInfo.character_perks_only;
  const avatarSrc = avatarUrlFor(targetName, role, characters);
  const charPerks = loadout.character_perks;
  const perkSlots = [0, 1, 2, 3];

  return (
    <div className="w-full min-h-[420px] bg-bg-surface border border-border-color rounded-2xl p-6 shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border-color pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-accent-red border-2 border-accent-red flex items-center justify-center overflow-hidden">
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt={targetDisplayName}
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full bg-bg-elevated rounded-xl flex items-center justify-center text-accent-red">
                  {role === 'survivor' ? <User className="w-10 h-10" aria-hidden="true" /> : <KillerIcon className="w-10 h-10" aria-hidden="true" />}
                </div>
              )}
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-accent-red text-text-inverted text-[10px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap tracking-wider shadow-sm">
              {dict?.streaks?.target || 'TARGET'}
            </span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {targetDisplayName}
            </h2>
            <div className="text-xs text-text-muted mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span>
                {dict?.characterDetail?.role || 'Role'}:{' '}
                <strong className="text-text-secondary capitalize">
                  {role === 'survivor' ? (dict?.filters?.survivor || 'Survivor') : (dict?.filters?.killer || 'Killer')}
                </strong>
              </span>
              <span>{dict?.streaks?.bulletSeparator || '•'}</span>
              <span>
                {dict?.stats?.streak || 'Streak'}:{' '}
                <strong className="text-accent-red font-mono">{run.current_streak}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Active Perk Tier Badge */}
        <div className="flex items-center gap-3 px-4 py-3 bg-accent-amber/10 border border-accent-amber/30 rounded-xl text-accent-amber w-full md:w-auto justify-center">
          <Lock className="w-5 h-5 text-accent-amber shrink-0" aria-hidden="true" />
          <div>
            <div className="text-[10px] uppercase font-black text-accent-amber tracking-wider">
              {dict?.streaks?.tierLabel || 'Tier'} {tierInfo.tier_level}: {tierInfo.name}
            </div>
            <div className="text-xs font-bold text-text-primary">
              {perkLimit === 0
                ? dict?.streaks?.perklessTrial || '0 Perks (Perkless Trial)'
                : `${perkLimit} ${perkLimit > 1 ? (dict?.streaks?.perksAllowedPlural || 'Perks Allowed') : (dict?.streaks?.perksAllowedSingular || 'Perk Allowed')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Build guide */}
      <div className="mb-8">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-red" aria-hidden="true" />
            {dict?.streaks?.yourBuildForMatch || 'Your build for this match'}
          </h3>
        </div>
        {charactersPerksOnly && perkLimit === 0 && (
          <p className="mb-4 text-xs text-text-secondary">
            {dict?.streaks?.noPerksThisTrial || 'No perks this trial.'} {targetDisplayName}{' '}
            {dict?.streaks?.goesInBare || 'goes in bare.'}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="list">
          {perkSlots.map((idx) => {
            if (idx >= perkLimit) {
              return (
                <div
                  key={`locked-${idx}`}
                  className="bg-bg-elevated/60 border border-border-color border-dashed rounded-xl p-4 flex items-center gap-3 opacity-60 select-none"
                >
                  <div className="w-16 h-16 shrink-0 bg-bg-elevated border border-border-color rounded-lg flex items-center justify-center text-text-muted" aria-hidden="true">
                    <Lock className="w-7 h-7" />
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
                  className="bg-accent-red/10 border border-accent-red/40 rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="relative w-16 h-16 shrink-0 bg-accent-red/10 border border-accent-red/30 rounded-lg flex items-center justify-center text-accent-red" aria-hidden="true">
                    <HelpCircle className="w-9 h-9" />
                    {avatarSrc && !avatarError && (
                      <img
                        src={avatarSrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full object-cover border-2 border-accent-red bg-bg-surface shadow-sm"
                      />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-black text-accent-red uppercase tracking-wider">
                      {dict?.streaks?.slotLabel || 'Slot'} {idx + 1}
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5 truncate">
                      {dict?.streaks?.ownPerkOf || 'Own perk:'} {targetDisplayName}
                    </p>
                  </div>
                </div>
              );
            }

            if (idx === 0) {
              return (
                <div
                  key="character-slot"
                  className="bg-accent-red/10 border border-accent-red/40 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div>
                    <h4 className="text-xs font-black text-accent-red uppercase tracking-wider">
                      {dict?.streaks?.slotOneOfThese || 'Slot 1: one of these'}
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {dict?.streaks?.ownPerksOf || 'Own perks:'} {targetDisplayName}
                    </p>
                  </div>
                  {charPerks.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {charPerks.map((perk, i) => (
                        <PerkIcon key={perk.id ?? i} perk={perk} />
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
                className="bg-bg-surface border border-border-color rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-16 h-16 shrink-0 bg-bg-elevated border border-border-color rounded-lg flex items-center justify-center text-text-muted" aria-hidden="true">
                  <HelpCircle className="w-9 h-9" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    {dict?.swf?.slot || 'Slot'} {idx + 1}
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {dict?.streaks?.anyPerkYouLike || 'Any perk you like'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onWin}
            disabled={loading}
            className="w-full sm:w-auto flex-1 max-w-xs bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 text-text-inverted font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center cursor-pointer"
          >
            {dict?.streaks?.winMatch || 'WON'}
          </button>

          <button
            type="button"
            onClick={onLoss}
            disabled={loading}
            className="w-full sm:w-auto flex-1 max-w-xs bg-accent-red hover:bg-accent-red-hover disabled:opacity-50 text-text-inverted font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center cursor-pointer"
          >
            {dict?.streaks?.loseMatch || 'LOST'}
          </button>
        </div>
      </div>
    </div>
  );
};

