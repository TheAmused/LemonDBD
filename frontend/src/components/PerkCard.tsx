'use client';

import React, { useState } from 'react';
import { Shield, Skull, ImageOff, Sparkles, CheckCircle2, Lock, Repeat } from 'lucide-react';

export interface Perk {
  id?: number;
  name: string;
  alternate_name?: string;
  is_generic_counterpart?: boolean;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  category: string;
  description: string;
  icon_url: string;
  icon_local_path: string;
  is_owned?: boolean;
  is_unlocked?: boolean;
}

interface PerkCardProps {
  perk: Perk;
  viewMode: 'grid' | 'list';
  onSelect: (perk: Perk) => void;
  dict: any;
}

export const PerkCard: React.FC<PerkCardProps> = ({ perk, viewMode, onSelect }) => {
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const cleanIconPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  const iconSrc = cleanIconPath ? `${backendBase}/static/${cleanIconPath}` : perk.icon_url;

  const isGeneral = !perk.character || perk.character === 'General' || perk.is_generic_counterpart;
  const isOwned = perk.is_owned !== false;

  const getAvatarSrc = () => {
    let rawPath = perk.character_avatar_path;
    if (!rawPath && perk.character && !isGeneral) {
      const subDir = perk.category === 'Survivor' ? 'survivors' : 'killers';
      const sanitized = perk.character
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

  const avatarSrc = getAvatarSrc();
  const isSurvivor = perk.category === 'Survivor';
  const isKiller = perk.category === 'Killer';

  const accentBorder = isSurvivor
    ? 'hover:border-emerald-500/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]'
    : isKiller
      ? 'hover:border-rose-500/60 hover:shadow-[0_0_25px_rgba(244,63,94,0.2)]'
      : 'hover:border-amber-500/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]';

  const topGlowLine = isSurvivor
    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
    : isKiller
      ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-600'
      : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500';

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(perk)}
        className={`group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-slate-900/80 p-3.5 shadow-sm hover:shadow-md dark:shadow-md ${accentBorder} transition-all duration-200 backdrop-blur-md ${!isOwned ? 'opacity-50 grayscale-[40%]' : ''
          }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-950 p-2 border border-slate-200 dark:border-slate-800 shadow-inner group-hover:border-slate-300 dark:group-hover:border-slate-700">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-12 w-12 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-200"
              />
            ) : (
              <ImageOff className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            )}
          </div>

          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors truncate">
                {perk.name}
              </h3>
              {isOwned ? (
                <span title="Owned / Unlocked">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                </span>
              ) : (
                <span title="Locked / Not Owned">
                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 truncate">
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {isGeneral ? 'General Perk' : perk.character}
              </p>
              {perk.alternate_name && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 shrink-0">
                  <Repeat className="h-2.5 w-2.5" />
                  <span>{perk.alternate_name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {avatarSrc && !avatarError ? (
            <img
              src={avatarSrc}
              alt={perk.character}
              onError={() => setAvatarError(true)}
              className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
              {isSurvivor ? (
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : isKiller ? (
                <Skull className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              ) : (
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
          )}

          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${isSurvivor
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
              }`}
            title={perk.category}
          >
            {isSurvivor ? <Shield className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(perk)}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-3xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-slate-900/80 p-5 shadow-sm hover:shadow-xl dark:shadow-lg ${accentBorder} hover:-translate-y-1.5 backdrop-blur-md transition-all duration-300 overflow-hidden ${!isOwned ? 'opacity-55 grayscale-[30%]' : ''
        }`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${topGlowLine}`} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-950 dark:to-slate-900 p-2 border border-slate-200 dark:border-slate-800 shadow-inner group-hover:border-cyan-500/40 transition-colors">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-14 w-14 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <ImageOff className="h-7 w-7 text-slate-400 dark:text-slate-500" />
            )}
          </div>

          <div className="relative flex items-center">
            {avatarSrc && !avatarError ? (
              <img
                src={avatarSrc}
                alt={perk.character}
                onError={() => setAvatarError(true)}
                className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md group-hover:border-cyan-500/40 transition-colors duration-300"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
                {isSurvivor ? (
                  <Shield className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Skull className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                )}
              </div>
            )}

            <div
              className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-md ${isSurvivor
                  ? 'border-emerald-500/60 bg-emerald-100 text-emerald-700 ring-2 ring-white dark:bg-emerald-950 dark:text-emerald-400 dark:ring-slate-950'
                  : 'border-rose-500/60 bg-rose-100 text-rose-700 ring-2 ring-white dark:bg-rose-950 dark:text-rose-400 dark:ring-slate-950'
                }`}
              title={perk.category}
            >
              {isSurvivor ? <Shield className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-base font-black leading-tight text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
              {perk.name}
            </h3>
            {isOwned ? (
              <span title="Owned / Unlocked">
                <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              </span>
            ) : (
              <span title="Locked / Not Owned">
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
              </span>
            )}
          </div>

          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
            {isGeneral ? 'General Perk' : perk.character}
          </p>

          {perk.alternate_name && (
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate flex items-center gap-1">
              <Repeat className="h-3 w-3 shrink-0" />
              <span>Alias: {perk.alternate_name}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};