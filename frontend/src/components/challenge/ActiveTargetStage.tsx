'use client';

import React, { useState } from 'react';
import { ChallengeRun, Role } from '@/types/challenge';
import {
  RefreshCw,
  MapPin,
  CheckCircle,
  XCircle,
  User,
  Skull,
  Sparkles,
  Lock,
  ShieldAlert,
  Ban,
} from 'lucide-react';

export interface ActiveTargetStageProps {
  run: ChallengeRun | null;
  role: Role;
  loading?: boolean;
  onWin: () => void;
  onLoss: () => void;
  onReroll: () => void;
  onInvalidateMatch?: (reason: 'dc_before_5_gens' | 'game_cancelled') => void;
  characterAvatarPath?: string;
}

export const ActiveTargetStage: React.FC<ActiveTargetStageProps> = ({
  run,
  role,
  loading = false,
  onWin,
  onLoss,
  onReroll,
  onInvalidateMatch,
  characterAvatarPath,
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const [perkImgErrors, setPerkImgErrors] = useState<Record<number, boolean>>({});

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  if (!run || !run.current_loadout) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-md mb-8">
        <div className="animate-spin text-amber-500 mx-auto w-8 h-8 mb-3 flex items-center justify-center">
          <RefreshCw className="w-8 h-8" />
        </div>
        <p className="text-slate-400 text-sm">Loading active challenge stage...</p>
      </div>
    );
  }

  const loadout = run.current_loadout;
  const targetName = loadout.character || run.current_character_id || 'Target Character';

  // Tier info resolution
  const tierInfo = run.tier_info || {
    name: 'The Warm Up',
    tier_level: 0,
    perk_limit: 4,
    description: '4 Perks Allowed',
  };
  const perkLimit = tierInfo.perk_limit !== undefined ? tierInfo.perk_limit : 4;

  // Build target avatar URL
  const getAvatarUrl = () => {
    let rawPath = characterAvatarPath;
    if (!rawPath && targetName) {
      const subDir = role === 'survivor' ? 'survivors' : 'killers';
      const sanitized = targetName
        .toLowerCase()
        .trim()
        .replace(/[\s\-/]+/g, '_')
        .replace(/[\\/*?:"<>|]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      rawPath = `avatars/${subDir}/${sanitized}.png`;
    }
    if (!rawPath) return null;
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  };

  const avatarSrc = getAvatarUrl();

  const handlePerkImgError = (idx: number) => {
    setPerkImgErrors((prev) => ({ ...prev, [idx]: true }));
  };

  // Build 4 slots array
  const perkSlots = [0, 1, 2, 3];

  return (
    <div className="w-full bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md mb-8">
      {/* Top Banner / Stage Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-6 mb-6">
        {/* Target Character Display */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="relative">
            {/* Amber Border Ring around Character Portrait */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-500 border-2 border-amber-400 shadow-lg shadow-amber-500/20 flex items-center justify-center overflow-hidden">
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt={targetName}
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-amber-400">
                  {role === 'survivor' ? (
                    <User className="w-10 h-10" />
                  ) : (
                    <Skull className="w-10 h-10" />
                  )}
                </div>
              )}
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap tracking-wider shadow-sm">
              TARGET
            </span>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-amber-400 mb-1">
              Active Challenge Target
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {targetName}
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span>Role: <strong className="text-slate-200 capitalize">{role}</strong></span>
              <span>•</span>
              <span>Streak: <strong className="text-amber-400">{run.current_streak}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Header Badges: Tier Info & Map Offering */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Active Perk Tier Badge */}
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 w-full sm:w-auto justify-center">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                Tier {tierInfo.tier_level}: {tierInfo.name}
              </div>
              <div className="text-xs font-bold text-white">
                {perkLimit === 0 ? '0 Perks (Perkless Trial)' : `${perkLimit} Perk${perkLimit > 1 ? 's' : ''} Allowed`}
              </div>
            </div>
          </div>

          {/* Map Offering Badge */}
          {loadout.map_offering && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-300 w-full sm:w-auto justify-center">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Map Offering
                </div>
                <div className="text-sm font-bold text-amber-200">
                  {loadout.map_offering.name}
                </div>
                <div className="text-xs text-slate-400">
                  {loadout.map_offering.realm}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Perk Loadout Grid (4 Perks with Tier Locks) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Assigned Loadout ({perkLimit} Perk{perkLimit !== 1 ? 's' : ''} Active)
          </h3>
          {perkLimit < 4 && (
            <span className="text-xs text-amber-400 font-semibold px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
              {4 - perkLimit} Slot{4 - perkLimit > 1 ? 's' : ''} Locked by Tier Rule
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perkSlots.map((idx) => {
            const isLocked = idx >= perkLimit;
            const perk = (loadout.perks || [])[idx];

            if (isLocked) {
              return (
                <div
                  key={`locked-${idx}`}
                  className="bg-slate-950/40 border border-slate-800/80 border-dashed rounded-xl p-4 flex items-center gap-3 opacity-60 select-none"
                >
                  <div className="w-14 h-14 shrink-0 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-center text-slate-600">
                    <Lock className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Locked Slot #{idx + 1}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No Perk Allowed (Tier {tierInfo.tier_level})
                    </p>
                  </div>
                </div>
              );
            }

            if (!perk) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3 opacity-80"
                >
                  <div className="w-14 h-14 shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400">Empty Slot</h4>
                    <p className="text-xs text-slate-500">No perk selected</p>
                  </div>
                </div>
              );
            }

            const cleanPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
            const iconSrc = cleanPath ? `${backendBase}/static/${cleanPath}` : perk.icon_url;
            const hasError = perkImgErrors[idx];

            return (
              <div
                key={perk.id || idx}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3 hover:border-amber-500/40 transition-all shadow-md group"
              >
                <div className="relative w-14 h-14 shrink-0 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center p-1 group-hover:border-amber-400 transition-colors overflow-hidden">
                  {iconSrc && !hasError ? (
                    <img
                      src={iconSrc}
                      alt={perk.name}
                      className="w-full h-full object-contain filter drop-shadow-md"
                      onError={() => handlePerkImgError(idx)}
                    />
                  ) : (
                    <Sparkles className="w-6 h-6 text-amber-400/60" />
                  )}
                </div>

                <div className="overflow-hidden">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                    {perk.name}
                  </h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {perk.character && perk.character !== 'General'
                      ? perk.character
                      : 'General Perk'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons & Match Exception Handlers */}
      <div className="space-y-4 pt-2 border-t border-slate-800/80">
        {/* Standard Match Outcome Buttons: WIN, LOSE, REROLL */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onWin}
            disabled={loading}
            className="w-full sm:w-auto flex-1 max-w-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5 text-emerald-100" />
            <span>WIN MATCH</span>
          </button>

          <button
            onClick={onLoss}
            disabled={loading}
            className="w-full sm:w-auto flex-1 max-w-xs bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-base py-3.5 px-6 rounded-xl shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <XCircle className="w-5 h-5 text-rose-100" />
            <span>LOSE MATCH</span>
          </button>

          <button
            onClick={onReroll}
            disabled={loading}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 active:bg-slate-900 disabled:opacity-50 text-slate-200 border border-slate-700 font-bold text-sm py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reroll</span>
          </button>
        </div>

        {/* Match Exception Buttons: DC < 5 Gens & Game Cancelled */}
        {onInvalidateMatch && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Match Exception:
            </span>
            <button
              onClick={() => onInvalidateMatch('dc_before_5_gens')}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              title="Invalidate match & re-roll for same character due to disconnect before 5 generators"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>DC &lt; 5 Gens</span>
            </button>

            <button
              onClick={() => onInvalidateMatch('game_cancelled')}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              title="Invalidate match & re-roll for same character due to loading disconnect"
            >
              <Ban className="w-3.5 h-3.5 text-slate-400" />
              <span>Game Cancelled</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
