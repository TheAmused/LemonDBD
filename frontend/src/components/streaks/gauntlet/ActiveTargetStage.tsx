'use client';

import React, { useState, useEffect } from 'react';
import { GauntletRun, Perk, Role } from '@/types/gauntletStreak';
import { OwnedCharacterItem } from './useOwnedCharacters';
import { useTargetDraw } from './useTargetDraw';
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
}

/** The cycling portrait shown while the target is being drawn. */
const RevealPortrait: React.FC<{ name?: string; role: Role }> = ({ name, role }) => {
  const [failed, setFailed] = useState(false);
  const src = name ? avatarUrlFor(name, role) : null;

  useEffect(() => setFailed(false), [name]);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-950 rounded-xl flex items-center justify-center text-amber-500 dark:text-amber-400">
        {role === 'survivor' ? <User className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="w-full h-full object-cover rounded-xl"
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
}) => {
  const [avatarError, setAvatarError] = useState(false);

  const targetName = run?.current_character_id || run?.current_loadout?.character || '';
  const completed = run?.completed_characters || [];

  // The reel runs through whoever is still standing, in roster order.
  const drawPool = React.useMemo(() => {
    const names = characters.map((c) => c.name).filter((name) => !completed.includes(name));
    return names.includes(targetName) ? names : [...names, targetName].filter(Boolean);
  }, [characters, completed.join('|'), targetName]);

  const { displayName, isDrawing, start: startDraw } = useTargetDraw(drawPool, targetName);

  // Which target the card is currently allowed to show. Holding this in state
  // (rather than reacting after the fact) keeps a freshly drawn target from
  // flashing on screen for a frame before its reel starts.
  const [shownTarget, setShownTarget] = useState<string | null>(null);
  const isRevealed = Boolean(run?.target_revealed);
  const awaitingDraw = isRevealed && Boolean(targetName) && shownTarget !== targetName;

  // Every later match re-runs the reel on its own, so the next target arrives
  // as a reveal rather than just appearing in place.
  useEffect(() => {
    if (!isRevealed || !targetName) {
      setShownTarget(null);
      return;
    }
    if (shownTarget === targetName || isDrawing) return;

    // A run that was already revealed before this mount (a reload, say) has
    // nothing to reveal, so it skips straight to the card.
    if (shownTarget === null) {
      setShownTarget(targetName);
      return;
    }
    startDraw(() => setShownTarget(targetName));
  }, [isRevealed, targetName, shownTarget, isDrawing, startDraw]);

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

  if (!run.target_revealed || isDrawing || awaitingDraw) {
    const roleLabel = role === 'survivor' ? 'Survivor' : 'Killer';
    const drawing = isDrawing || awaitingDraw;
    return (
      <div className="w-full bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
        <div className="w-24 h-24 mx-auto rounded-2xl p-1 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 border-2 border-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden mb-4">
          <RevealPortrait name={drawing ? displayName ?? undefined : undefined} role={role} />
        </div>

        {drawing ? (
          <>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Drawing your {roleLabel}...</h2>
            <p className="h-6 text-sm font-bold text-amber-600 dark:text-amber-400">{displayName}</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Ready for the Gauntlet?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Start the game to draw your {roleLabel}.
            </p>
            <button
              onClick={() =>
                startDraw(() => {
                  setShownTarget(targetName);
                  onReveal();
                })
              }
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-extrabold text-base py-3.5 px-8 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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
    addons: rawLoadout.addons || [],
    item: rawLoadout.item ?? null,
  };
  const tierInfo = run.tier_info || { name: 'The Warm Up', tier_level: 0, perk_limit: 4, description: '' };
  const perkLimit = tierInfo.perk_limit;
  const avatarSrc = avatarUrlFor(targetName, role);
  const perkSlots = [0, 1, 2, 3];

  return (
    <div className="w-full bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-950/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-2xl backdrop-blur-md mb-8">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perkSlots.map((idx) => {
            if (idx >= perkLimit) {
              return (
                <div
                  key={`locked-${idx}`}
                  className="bg-slate-100/60 border border-slate-200 border-dashed dark:bg-slate-950/40 dark:border-slate-800/80 rounded-xl p-4 flex items-center gap-3 opacity-60 select-none"
                >
                  <div className="w-12 h-12 shrink-0 bg-slate-200/80 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-600">
                    <Lock className="w-5 h-5" />
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

            // Slot 1 is the character-perk slot: one of the target's own teachables.
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
                  {loadout.character_perks.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {loadout.character_perks.map((perk, i) => (
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
                <div className="w-12 h-12 shrink-0 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <HelpCircle className="w-7 h-7" />
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

      {(loadout.item || loadout.addons.length > 0) && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
            Rolled Gear
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loadout.item && (
              <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{loadout.item.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">Item</p>
              </div>
            )}
            {loadout.addons.map((addon, idx) => (
              <div key={addon.id || idx} className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{addon.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">Add-on</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
