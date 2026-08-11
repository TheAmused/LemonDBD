'use client';

import React, { useState } from 'react';
import { Shield, Skull, ImageOff, User } from 'lucide-react';

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

export const PerkCard: React.FC<PerkCardProps> = ({ perk, viewMode, onSelect }) => {
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
        className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm hover:border-amber-500/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] dark:border-slate-800/80 dark:bg-slate-900/80 transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/50 p-2 dark:from-slate-900 dark:to-slate-950 border border-slate-200/60 dark:border-slate-800 shadow-inner group-hover:border-amber-500/40">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-14 w-14 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
              />
            ) : (
              <ImageOff className="h-6 w-6 text-slate-400" />
            )}
          </div>

          <div>
            <h3 className="font-extrabold text-base text-slate-900 group-hover:text-amber-500 dark:text-slate-100 transition-colors">
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
              className="h-12 w-12 rounded-2xl object-cover border-2 border-slate-700 shadow-sm"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 border-2 border-slate-700">
              {isSurvivor ? <Shield className="h-6 w-6 text-emerald-400" /> : <Skull className="h-6 w-6 text-rose-400" />}
            </div>
          )}

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
              isSurvivor
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
            }`}
            title={perk.category}
          >
            {isSurvivor ? <Shield className="h-4.5 w-4.5" /> : <Skull className="h-4.5 w-4.5" />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(perk)}
      className="group relative flex cursor-pointer flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-md hover:-translate-y-1.5 hover:border-amber-500/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] dark:border-slate-800/80 dark:bg-slate-900/90 backdrop-blur-md transition-all duration-300 overflow-hidden"
    >
      {/* Top Role Glow Accent Line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          isSurvivor
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
            : 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-600'
        }`}
      />

      <div className="flex flex-col gap-4">
        {/* Top Header Showcase Row */}
        <div className="flex items-center justify-between">
          {/* Left: MASSIVE Perk Icon Container */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/60 p-2 dark:from-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-inner group-hover:border-amber-500/50 transition-colors">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-16 w-16 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <ImageOff className="h-8 w-8 text-slate-400" />
            )}
          </div>

          {/* Right: BIGGER Character Avatar + Top Right Role Icon Badge */}
          <div className="relative flex items-center">
            {avatarSrc && !avatarError ? (
              <img
                src={avatarSrc}
                alt={perk.character}
                onError={() => setAvatarError(true)}
                className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-700 shadow-lg group-hover:border-amber-500/60 transition-colors duration-300"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 border-2 border-slate-700 text-slate-400">
                {isSurvivor ? <Shield className="h-8 w-8 text-emerald-400" /> : <Skull className="h-8 w-8 text-rose-400" />}
              </div>
            )}

            {/* Top-Right Role Icon Badge (Replacing text pill 'KILLER' / 'SURVIVOR') */}
            <div
              className={`absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border shadow-lg backdrop-blur-md ${
                isSurvivor
                  ? 'border-emerald-500/60 bg-emerald-950 text-emerald-400 ring-2 ring-slate-950'
                  : 'border-rose-500/60 bg-rose-950 text-rose-400 ring-2 ring-slate-950'
              }`}
              title={perk.category}
            >
              {isSurvivor ? <Shield className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
            </div>
          </div>
        </div>

        {/* Hero Perk Title (No Character text label, No Inspect Perk bottom row!) */}
        <h3 className="text-lg font-black leading-tight text-slate-900 group-hover:text-amber-500 dark:text-slate-100 transition-colors">
          {perk.name}
        </h3>
      </div>
    </div>
  );
};