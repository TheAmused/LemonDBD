'use client';
// frontend/src/components/character-detail/CharactersSkeleton.tsx

import React from 'react';
import { Shield, Skull, Search, User, Sparkles, Layers } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface CharactersSkeletonProps {
  className?: string;
  dict?: Dictionary | any;
  ariaLabel?: string;
  count?: number;
}

/**
 * Tailored, layout-matched skeleton for the Character Roster Grid (/characters).
 * Matches exact aspect ratios (3:4), paddings, rounded corners, and grid breakpoints to guarantee CLS = 0.
 */
export const CharactersGridSkeleton: React.FC<CharactersSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
  count = 18,
}) => {
  const loadingLabel = ariaLabel || dict?.characterDetail?.loading || dict?.app?.loading || '';

  return (
    <div
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`space-y-6 select-none animate-pulse ${className}`}
    >
      {/* 1. Filter Navigation Header Placeholder */}
      <section className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Role Toggle Switch Placeholder */}
        <div className="relative flex items-center w-full sm:w-72 h-11 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner">
          <div className="flex-1 flex items-center justify-center gap-1.5 h-full rounded-xl bg-slate-800/80">
            <Shield className="h-3.5 w-3.5 text-emerald-500/40" />
            <div className="h-3.5 w-20 bg-slate-700/60 rounded" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5 h-full rounded-xl">
            <Skull className="h-3.5 w-3.5 text-rose-500/40" />
            <div className="h-3.5 w-16 bg-slate-800/60 rounded" />
          </div>
        </div>

        {/* Action Button Placeholder */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-36 rounded-2xl bg-slate-900 border border-slate-800" />
        </div>

        {/* Search Bar Placeholder */}
        <div className="relative w-full sm:w-72 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center px-3.5 gap-2">
          <Search className="h-4 w-4 text-slate-700" />
          <div className="h-3 w-32 bg-slate-800 rounded" />
        </div>
      </section>

      {/* 2. Responsive 2 to 6 Column Character Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm"
          >
            {/* Top Badge Placeholder */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950 flex flex-col justify-between p-2">
              <div className="flex justify-end">
                <div className="h-5 w-16 rounded-full bg-slate-800 border border-slate-700/50" />
              </div>
              <div className="flex items-center justify-center py-6 opacity-20">
                <User className="h-12 w-12 text-slate-600" />
              </div>
            </div>

            {/* Bottom Info Section */}
            <div className="p-3.5 space-y-2 bg-slate-900/90">
              <div className="h-4 w-28 bg-slate-800 rounded" />
              <div className="h-3 w-16 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Tailored, layout-matched skeleton for the Character Detail Page (/characters/[slug]).
 * Matches breadcrumbs, hero avatar section, combat stats / power card, teachable perks, and equipment grids.
 */
export const CharacterDetailSkeleton: React.FC<CharactersSkeletonProps> = ({
  className = '',
  dict,
  ariaLabel,
}) => {
  const loadingLabel = ariaLabel || dict?.characterDetail?.loading || dict?.app?.loading || '';

  return (
    <article
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`space-y-8 select-none animate-pulse w-full ${className}`}
    >
      {/* 1. Breadcrumbs Navigator Placeholder */}
      <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-20 bg-slate-800 rounded" />
          <span className="text-slate-700">/</span>
          <div className="h-3.5 w-16 bg-slate-800 rounded" />
          <span className="text-slate-700">/</span>
          <div className="h-3.5 w-28 bg-slate-700 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-slate-800" />
          <div className="h-8 w-8 rounded-xl bg-slate-800" />
        </div>
      </div>

      {/* 2. Main Hero Showcase Placeholder */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Avatar Portrait */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[360px] sm:max-w-[400px] aspect-[3/4] rounded-3xl bg-slate-950 border-2 border-slate-800 overflow-hidden relative shadow-2xl flex items-center justify-center">
            <User className="h-20 w-20 text-slate-800" />
            <div className="absolute top-3 right-3 h-6 w-20 rounded-full bg-slate-800" />
          </div>
        </div>

        {/* Right: Character Meta & Power / Overview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2.5">
            <div className="h-8 w-64 bg-slate-800 rounded-xl" />
            <div className="h-4 w-40 bg-slate-800/60 rounded-lg" />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="h-3 w-14 bg-slate-800/70 rounded" />
                <div className="h-5 w-20 bg-slate-700 rounded" />
              </div>
            ))}
          </div>

          {/* Power / Capability Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-44 bg-slate-800 rounded" />
              <div className="h-6 w-20 rounded-lg bg-slate-800" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-800/70 rounded" />
              <div className="h-3.5 w-5/6 bg-slate-800/70 rounded" />
              <div className="h-3.5 w-4/6 bg-slate-800/70 rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Teachable Perks Section Placeholder */}
      <section className="space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-slate-800 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-3 w-20 bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="h-3 w-full bg-slate-800/50 rounded" />
                <div className="h-3 w-4/5 bg-slate-800/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Equipment / Addons Grid Placeholder */}
      <section className="space-y-4">
        <div className="h-6 w-40 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="h-12 w-12 rounded-xl bg-slate-950 border border-slate-800 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-28 bg-slate-800 rounded" />
                <div className="h-2.5 w-16 bg-slate-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
};

export default CharactersGridSkeleton;
