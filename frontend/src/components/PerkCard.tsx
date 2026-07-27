'use client';

import React, { useState } from 'react';
import { User, Shield, Sparkles, ImageOff } from 'lucide-react';

export interface Perk {
  name: string;
  character: string;
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
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const iconSrc = perk.icon_local_path
    ? `${backendBase}/static/${perk.icon_local_path}`
    : perk.icon_url;

  const isSurvivor = perk.category === 'Survivor';

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(perk)}
        className="group flex cursor-pointer items-center justify-between rounded-xl border border-slate-200/80 bg-white/60 p-3.5 shadow-sm hover:border-red-500/50 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-red-500/50 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-slate-100 to-slate-200/60 p-2 dark:from-slate-900 dark:to-slate-950 border border-slate-200/50 dark:border-slate-800">
            {!imgError ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-10 w-10 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
              />
            ) : (
              <ImageOff className="h-5 w-5 text-slate-400" />
            )}
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-900 group-hover:text-red-600 dark:text-slate-100 dark:group-hover:text-red-400 transition-colors">
              {perk.name}
            </h3>
            <div className="mt-1 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <User className="h-3 w-3 text-slate-400" />
                {perk.character}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  isSurvivor
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {perk.category}
              </span>
            </div>
          </div>
        </div>

        <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 group-hover:bg-red-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 transition-colors">
          {dict.card.viewDetails}
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(perk)}
      className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm hover:-translate-y-1 hover:border-red-500/50 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-red-500/50 backdrop-blur-md transition-all duration-200 overflow-hidden"
    >
      {/* Decorative Top Accent Bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isSurvivor ? 'bg-emerald-500' : 'bg-rose-600'
        }`}
      />

      <div>
        {/* Header Icon + Role Badge */}
        <div className="mb-4 flex items-center justify-between">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/50 p-2.5 dark:from-slate-900/90 dark:to-slate-950 border border-slate-200/60 dark:border-slate-800 shadow-inner group-hover:border-red-500/30 transition-colors">
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

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${
              isSurvivor
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-400'
            }`}
          >
            {perk.category}
          </span>
        </div>

        {/* Title & Character Info */}
        <h3 className="text-base font-bold leading-tight text-slate-900 group-hover:text-red-600 dark:text-slate-100 dark:group-hover:text-red-400 transition-colors">
          {perk.name}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">{perk.character}</span>
        </div>
      </div>

      {/* Action Footer Button */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-red-600 dark:text-slate-400 dark:group-hover:text-red-400">
        <span>{dict.card.viewDetails}</span>
        <Sparkles className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};