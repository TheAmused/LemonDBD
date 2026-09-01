'use client';
// frontend/src/components/generator/RandomizerSkeleton.tsx

import React from 'react';
import { Shield, Skull, Zap, CircleDot, Rows3, Layers, Gift, Sparkles, Volume2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface RandomizerSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
}

/**
 * Tailored, layout-matched skeleton for the Perk Randomizer / Generator (/randomizer).
 * Matches exact toolbar controls, mode switcher tabs, central stage container, and 4-slot diamond loadout dock.
 */
export const RandomizerPageSkeleton: React.FC<RandomizerSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.generator?.loading || dict?.app?.loading || '';

  return (
    <div
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`space-y-6 select-none animate-pulse w-full max-w-6xl mx-auto flex flex-col items-center ${className}`}
    >
      {/* 1. Top Control Bar: Role Toggle & Toolbar Actions */}
      <section className="flex flex-col sm:flex-row gap-4 justify-between items-center w-full">
        {/* Role Toggle Switch Placeholder */}
        <div className="relative flex items-center w-full sm:w-64 h-11 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner">
          <div className="flex-1 flex items-center justify-center gap-1.5 h-full rounded-xl bg-slate-800/80">
            <Shield className="h-3.5 w-3.5 text-emerald-500/40" />
            <div className="h-3.5 w-16 bg-slate-700/60 rounded" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5 h-full rounded-xl">
            <Skull className="h-3.5 w-3.5 text-rose-500/40" />
            <div className="h-3.5 w-14 bg-slate-800/60 rounded" />
          </div>
        </div>

        {/* Toolbar Utility Buttons Placeholder */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      </section>

      {/* 2. Mode Switcher Tabs Placeholder */}
      <section className="flex items-center justify-center gap-3 w-full py-2 overflow-x-auto">
        {[
          { label: 'Instant', icon: <Zap className="h-3.5 w-3.5" /> },
          { label: 'Wheel', icon: <CircleDot className="h-3.5 w-3.5" /> },
          { label: 'Slot Machine', icon: <Rows3 className="h-3.5 w-3.5" /> },
          { label: 'Tarot Deck', icon: <Layers className="h-3.5 w-3.5" /> },
          { label: 'Loot Crate', icon: <Gift className="h-3.5 w-3.5" /> },
        ].map((tab, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold shrink-0 ${
              idx === 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/60 text-slate-500 border-slate-800'
            }`}
          >
            {tab.icon}
            <div className="h-3 w-16 bg-slate-700/50 rounded" />
          </div>
        ))}
      </section>

      {/* 3. Central Stage Container Placeholder */}
      <div className="w-full min-h-[380px] sm:min-h-[440px] rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
        <div className="h-16 w-16 rounded-3xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-600 mb-4">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="h-4 w-48 bg-slate-800 rounded-lg mb-2" />
        <div className="h-3 w-32 bg-slate-800/60 rounded-md" />
      </div>

      {/* 4. 4-Slot Perk Loadout Dock Placeholder */}
      <section className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg"
          >
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-slate-950 border-2 border-slate-800 flex items-center justify-center rotate-45 overflow-hidden">
              <div className="-rotate-45 h-8 w-8 rounded-lg bg-slate-800/50" />
            </div>
            <div className="h-3.5 w-20 bg-slate-800 rounded" />
          </div>
        ))}
      </section>
    </div>
  );
};

export default RandomizerPageSkeleton;
