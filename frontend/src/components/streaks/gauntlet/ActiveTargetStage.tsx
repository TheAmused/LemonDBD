// frontend/src/components/streaks/gauntlet/ActiveTargetStage.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GauntletRun, Perk, Role } from '@/types/gauntletStreak';
import { OwnedCharacterItem } from './useOwnedCharacters';
import { useTargetDraw, DrawPhase } from './useTargetDraw';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  User,
  Skull,
  Sparkles,
  Lock,
  HelpCircle,
} from 'lucide-react';

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const avatarUrlFor = (name: string, role: Role) => {
  if (!name) return null;
  const subDir = role === 'survivor' ? 'survivors' : 'killers';
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${backendBase}/static/avatars/${subDir}/${sanitized}.png`;
};

const KILLER_SEND_OFFS = [
  'Good luck out there.',
  'The fog is waiting.',
  'Make it count.',
  'Go get them.',
  'Your trial awaits.',
  'Time to earn it.',
  'Bring them home.',
  'Good hunting.',
  'Off you go.',
  'Earn it.',
];

const SURVIVOR_SEND_OFFS = [
  'Good luck out there.',
  'Try not to die.',
  'Run for it.',
  'Your trial awaits.',
  'Off you go.',
  'Earn it.',
];

const perkIconFor = (perk: Perk) => {
  const cleanPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  return cleanPath ? `${backendBase}/static/${cleanPath}` : perk.icon_url;
};

export interface ActiveTargetStageProps {
  run: GauntletRun | null;
  role: Role;
  characters: OwnedCharacterItem[];
  loading?: boolean;
  onWin: () => void;
  onLoss: () => void;
  onReveal: () => void;
  /** Holds off the next reel while something else (the checkpoint modal) has the floor. */
  holdReel?: boolean;
  /** The target the reel has actually finished landing on, lifted so the roster grid can share it. */
  shownTarget: string | null;
  onShownTargetChange: (name: string | null) => void;
}

/**
 * The portrait on the reel. Re-keying it per name restarts the frame animation,
 * so each face fades in rather than swapping flatly.
 */
const RevealPortrait: React.FC<{ name?: string; role: Role; phase: DrawPhase }> = ({
  name,
  role,
  phase,
}) => {
  const [failed, setFailed] = useState(false);
  const src = name ? avatarUrlFor(name, role) : null;

  useEffect(() => setFailed(false), [name]);

  const motion = phase === 'landed' ? 'gn-land-frame' : phase === 'spinning' ? 'gn-spin-frame' : '';

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 dark:text-amber-400 ${motion}`}
      >
        {role === 'survivor' ? <User className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
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
  const [failed, setFailed] = useState(false);
  const src = perkIconFor(perk);

  return (
    <div
      title={perk.name}
      className={`relative ${size} shrink-0 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center p-1 overflow-hidden`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={perk.name}
          className="w-full h-full object-contain filter drop-shadow-md"
          onError={() => setFailed(true)}
        />
      ) : (
        <Sparkles className="w-5 h-5 text-amber-500/60 dark:text-amber-400/60" />
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
}) => {
  const [avatarError, setAvatarError] = useState(false);

  const targetName = run?.current_character_id || run?.current_loadout?.character || '';
  const completed = run?.completed_characters || [];

  // The reel runs through whoever is still standing, in roster order.
  const drawPool = React.useMemo(() => {
    const names = characters.map((c) => c.name).filter((name) => !completed.includes(name));
    return names.includes(targetName) ? names : [...names, targetName].filter(Boolean);
  }, [characters, completed.join('|'), targetName]);

  const { displayName, phase, isDrawing, start: startDraw } = useTargetDraw(drawPool, targetName);

  const sendOffPool = role === 'killer' ? KILLER_SEND_OFFS : SURVIVOR_SEND_OFFS;
  const [sendOff, setSendOff] = useState(sendOffPool[0]);
  const beginDraw = useCallback(
    (onDone: () => void) => {
      setSendOff(sendOffPool[Math.floor(Math.random() * sendOffPool.length)]);
      startDraw(onDone);
    },
    [startDraw, sendOffPool]
  );

  // Which target the card is currently allowed to show. Holding this in state
  // (rather than reacting after the fact) keeps a freshly drawn target from
  // flashing on screen for a frame before its reel starts.
  const isRevealed = Boolean(run?.target_revealed);
  const awaitingDraw = isRevealed && Boolean(targetName) && shownTarget !== targetName;

  // Every later match re-runs the reel on its own, so the next target arrives
  // as a reveal rather than just appearing in place.
  useEffect(() => {
    if (!isRevealed || !targetName) {
      onShownTargetChange(null);
      return;
    }
    if (shownTarget === targetName || isDrawing) return;

    // A run that was already revealed before this mount (a reload, say) has
    // nothing to reveal, so it skips straight to the card.
    if (shownTarget === null) {
      onShownTargetChange(targetName);
      return;
    }
    // The checkpoint modal gets its moment before the next reel steals focus;
    // this effect re-fires once holdReel drops, picking the draw back up.
    if (holdReel) return;
    beginDraw(() => onShownTargetChange(targetName));
  }, [isRevealed, targetName, shownTarget, isDrawing, beginDraw, holdReel, onShownTargetChange]);

  // The very first reveal is player-triggered (the START GAME click) and its
  // backend confirmation (target_revealed flipping true) lands after the
  // reel's local hold already ended. `revealing` spans that whole window
  // explicitly, from click to confirmation, so the card never falls back to
  // "Ready for the Gauntlet?" mid-flow -- unlike deriving the gap from
  // shownTarget/targetName equality, it doesn't care whether those two end up
  // spelled identically once the backend response lands.
  const [revealing, setRevealing] = useState(false);
  useEffect(() => {
    if (isRevealed && !isDrawing) setRevealing(false);
  }, [isRevealed, isDrawing]);

  if (!run || !run.current_loadout) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-md mb-8">
        <div className="animate-spin text-amber-500 mx-auto w-8 h-8 mb-3 flex items-center justify-center">
          <RefreshCw className="w-8 h-8" />
        </div>
        <p className="text-slate-400 text-sm">Loading active gauntlet stage...</p>
      </div>
    );
  }

  if (!run.target_revealed || isDrawing || awaitingDraw || revealing) {
    const drawing = isDrawing || awaitingDraw || revealing;
    return (
      <div className="w-full min-h-[420px] flex flex-col items-center justify-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-8 py-4 text-center shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
        <div
          className={`w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-2xl p-1.5 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 border-2 border-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden mb-6 ${
            phase === 'landed' ? 'gn-land-glow' : ''
          }`}
        >
          <RevealPortrait
            key={drawing ? displayName ?? 'idle' : 'idle'}
            name={drawing ? displayName ?? undefined : undefined}
            role={role}
            phase={drawing ? phase : 'idle'}
          />
        </div>

        {drawing ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
              {displayName ?? ' '}
            </h2>
            <p
              className={`h-6 text-base font-bold text-amber-600 dark:text-amber-400 ${
                phase === 'landed' ? 'gn-name-in' : ''
              }`}
            >
              {phase === 'landed' ? sendOff : ' '}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-8">Ready for the Gauntlet?</h2>
            <button
              onClick={() => {
                setRevealing(true);
                beginDraw(() => {
                  onShownTargetChange(targetName);
                  onReveal();
                });
              }}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-extrabold text-lg py-4 px-10 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              START GAME
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
  const avatarSrc = avatarUrlFor(targetName, role);
  const charPerks = loadout.character_perks;
  const perkSlots = [0, 1, 2, 3];

  return (
    <div className="w-full min-h-[420px] bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
      {/* Top Banner / Stage Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 border-2 border-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden">
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt={targetName}
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 dark:text-amber-400">
                  {role === 'survivor' ? <User className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
                </div>
              )}
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap tracking-wider shadow-sm">
              TARGET
            </span>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 mb-1">
              Active Gauntlet Target
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {targetName}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span>Role: <strong className="text-slate-700 dark:text-slate-200 capitalize">{role}</strong></span>
              <span>•</span>
              <span>Streak: <strong className="text-amber-600 dark:text-amber-400 font-mono">{run.current_streak}</strong></span>
            </div>
          </div>
        </div>

        {/* Active Perk Tier Badge */}
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 w-full md:w-auto justify-center">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">
              Tier {tierInfo.tier_level}: {tierInfo.name}
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {perkLimit === 0 ? '0 Perks (Perkless Trial)' : `${perkLimit} Perk${perkLimit > 1 ? 's' : ''} Allowed`}
            </div>
          </div>
        </div>
      </div>

      {/* Build guide: informational only, you pick the actual perks in-game */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Your build for this match
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick these in-game. Nothing to confirm here.
          </p>
        </div>

        {charactersPerksOnly && perkLimit === 0 && (
          <p className="mb-4 text-xs text-slate-600 dark:text-slate-300">
            No perks this trial. {targetName} goes in bare.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perkSlots.map((idx) => {
            if (idx >= perkLimit) {
              return (
                <div
                  key={`locked-${idx}`}
                  className="bg-slate-100/60 border border-slate-200 border-dashed dark:bg-slate-950/40 dark:border-slate-800/80 rounded-xl p-4 flex items-center gap-3 opacity-60 select-none"
                >
                  <div className="w-16 h-16 shrink-0 bg-slate-200/80 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-600">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Slot {idx + 1} locked
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Tier {tierInfo.tier_level} rule
                    </p>
                  </div>
                </div>
              );
            }

            if (charactersPerksOnly) {
              return (
                <div
                  key={`char-slot-${idx}`}
                  className="bg-amber-500/[0.07] border border-amber-500/40 rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="relative w-16 h-16 shrink-0 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <HelpCircle className="w-9 h-9" />
                    {avatarSrc && !avatarError && (
                      <img
                        src={avatarSrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full object-cover border-2 border-amber-400 bg-white dark:bg-slate-950 shadow-sm"
                      />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Slot {idx + 1}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {targetName}&apos;s own perk
                    </p>
                  </div>
                </div>
              );
            }

            if (idx === 0) {
              return (
                <div
                  key="character-slot"
                  className="bg-amber-500/[0.07] border border-amber-500/40 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div>
                    <h4 className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Slot 1: one of these
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {targetName}&apos;s own perks
                    </p>
                  </div>
                  {charPerks.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {charPerks.map((perk, i) => (
                        <PerkIcon key={perk.id ?? i} perk={perk} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No teachable perks on record for this character.
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div
                key={`free-${idx}`}
                className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-16 h-16 shrink-0 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <HelpCircle className="w-9 h-9" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Slot {idx + 1}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Any perk you like</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onWin}
            disabled={loading}
            className="w-full sm:w-auto flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-950/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5 text-emerald-100" />
            <span>WIN MATCH</span>
          </button>

          <button
            onClick={onLoss}
            disabled={loading}
            className="w-full sm:w-auto flex-1 max-w-xs bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg shadow-rose-950/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <XCircle className="w-5 h-5 text-rose-100" />
            <span>LOSE MATCH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
