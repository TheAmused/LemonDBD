'use client';

import React, { useState } from 'react';
import { Shield, Skull, ImageOff, Sparkles, User } from 'lucide-react';

export interface Perk {
  name: string;
  character: string;
  character_real_name?: string;
  character_avatar_path?: string;
  category: string;
  description: string;
  icon_url: string;
  icon_local_path: string;
}

interface PerkCardProps {
  perk: Perk;
  viewMode: 'grid' | 'list';
  onSelect: (perk: Perk) => void;
  dict: any;
}

export const PerkCard: React.FC<PerkCardProps> = ({ perk, viewMode, onSelect, dict }) => {
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const cleanIconPath = (perk.icon_local_path || '').replace(/^\/?(static\/)?/, '');
  const iconSrc = cleanIconPath
    ? `${backendBase}/static/${cleanIconPath}`
    : perk.icon_url;

  const getAvatarSrc = () => {
    let rawPath = perk.character_avatar_path;
    if (!rawPath && perk.character && perk.character !== 'General') {
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

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(perk)}
        className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 shadow-sm hover:border-amber-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-amber-500/50 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200/50 p-2 dark:from-slate-900/90 dark:to-slate-950 border border-slate-200/60 dark:border-slate-800">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-11 w-11 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
              />
            ) : (
              <ImageOff className="h-5 w-5 text-slate-400" />
            )}
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-500 dark:text-slate-100 transition-colors">
              {perk.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {avatarSrc && !avatarError ? (
            <img
              src={avatarSrc}
              alt={perk.character}
              onError={() => setAvatarError(true)}
              className="h-10 w-10 rounded-xl object-cover border border-slate-700 shadow-sm"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
              {isSurvivor ? <Shield className="h-5 w-5 text-emerald-400" /> : <Skull className="h-5 w-5 text-rose-400" />}
            </div>
          )}

          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
              isSurvivor
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
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
      className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-amber-500/50 backdrop-blur-md transition-all duration-200 overflow-hidden"
    >
      {/* Subtle Role Accent Line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isSurvivor ? 'bg-emerald-500' : 'bg-rose-600'
        }`}
      />

      <div>
        {/* Top Header Row */}
        <div className="mb-4 flex items-center justify-between">
          {/* Left: Full Perk Icon Container */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/50 p-2.5 dark:from-slate-900/90 dark:to-slate-950 border border-slate-200/60 dark:border-slate-800 shadow-inner group-hover:border-amber-500/40 transition-colors">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-12 w-12 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
              />
            ) : (
              <ImageOff className="h-6 w-6 text-slate-400" />
            )}
          </div>

          {/* Right: BIGGER Character Avatar + Top Right Role Icon Badge */}
          <div className="relative flex items-center">
            {avatarSrc && !avatarError ? (
              <img
                src={avatarSrc}
                alt={perk.character}
                onError={() => setAvatarError(true)}
                className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md group-hover:border-amber-500/50 transition-colors"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 border-2 border-slate-700 text-slate-400">
                {isSurvivor ? <Shield className="h-7 w-7 text-emerald-400" /> : <Skull className="h-7 w-7 text-rose-400" />}
              </div>
            )}

            {/* Top-Right Role Icon Badge (Replacing text pill 'KILLER' / 'SURVIVOR') */}
            <div
              className={`absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border shadow-md backdrop-blur-md ${
                isSurvivor
                  ? 'border-emerald-500/60 bg-emerald-950 text-emerald-400 ring-2 ring-emerald-950'
                  : 'border-rose-500/60 bg-rose-950 text-rose-400 ring-2 ring-rose-950'
              }`}
              title={perk.category}
            >
              {isSurvivor ? <Shield className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
            </div>
          </div>
        </div>

        {/* Perk Title as Hero Text (Character text label deleted!) */}
        <h3 className="text-base font-extrabold leading-snug text-slate-900 group-hover:text-amber-500 dark:text-slate-100 transition-colors">
          {perk.name}
        </h3>
      </div>

      {/* Bottom Inspect Perk Row */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-amber-500 transition-colors">
        <span>{dict.card.viewDetails}</span>
        <Sparkles className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};