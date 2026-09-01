'use client';
// frontend/src/components/smash-or-pass/SmashOrPassSkeleton.tsx

import React from 'react';
import { Heart, Layers, Sparkles, SlidersHorizontal, Trophy, Shuffle, Trash2, HelpCircle, Volume2, RotateCw, Maximize2, ThumbsDown } from 'lucide-react';

import type { Dictionary } from '@/locales/types';

interface SmashOrPassSkeletonProps {
  className?: string;
  mode?: 'full' | 'arena' | 'dock' | 'leaderboard';
  dict?: Dictionary | any;
  ariaLabel?: string;
}

/**
 * Tailored, layout-matched skeleton fallbacks for the Smash or Pass hub.
 * Matches exact aspect ratios, padding, rounded radiuses, and flex grids to guarantee CLS = 0.
 */
export const SmashHubSkeleton: React.FC<SmashOrPassSkeletonProps> = ({ className = '', dict, ariaLabel }) => {
  const loadingLabel = ariaLabel || dict?.smashOrPass?.loadingArena || dict?.app?.loading || '';

  return (
    <div
      role="status"
      aria-label={loadingLabel || undefined}
      aria-busy="true"
      className={`relative min-h-[calc(100vh-5rem)] flex flex-col justify-start space-y-3 pb-12 overflow-hidden select-none animate-pulse ${className}`}
    >
      {/* 1. FLANKING LORE WINGS PLACEHOLDER (Desktop only) */}
      <div className="hidden xl:flex absolute inset-0 pointer-events-none items-center justify-between px-6 z-10" aria-hidden="true">
        {/* Left Wing Placeholder */}
        <div className="w-56 space-y-3 opacity-30">
          <div className="h-16 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-3 space-y-1.5">
            <div className="h-2.5 w-16 bg-pink-500/20 rounded" />
            <div className="h-3 w-36 bg-zinc-800 rounded" />
          </div>
          <div className="h-20 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 p-3 space-y-1.5">
            <div className="h-2.5 w-20 bg-zinc-700/40 rounded" />
            <div className="h-3 w-44 bg-zinc-800/60 rounded" />
            <div className="h-3 w-28 bg-zinc-800/60 rounded" />
          </div>
        </div>

        {/* Right Wing Placeholder */}
        <div className="w-56 space-y-3 opacity-30">
          <div className="h-20 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-3 space-y-1.5">
            <div className="h-2.5 w-24 bg-purple-500/20 rounded" />
            <div className="h-3 w-40 bg-zinc-800 rounded" />
            <div className="h-3 w-32 bg-zinc-800 rounded" />
          </div>
          <div className="h-16 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 p-3 space-y-1.5">
            <div className="h-2.5 w-16 bg-zinc-700/40 rounded" />
            <div className="h-3 w-36 bg-zinc-800/60 rounded" />
          </div>
        </div>
      </div>

      {/* 2. UNIFIED COMMAND DOCK SKELETON */}
      <header className="relative z-20 mx-auto w-full max-w-6xl rounded-3xl bg-zinc-950/85 border border-pink-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3.5 sm:p-4 md:p-5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
          {/* LEFT: Live Session Telemetry Capsule */}
          <div className="flex items-center justify-center lg:justify-start w-full lg:w-auto order-2 lg:order-1 shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-inner">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-400/40" />
                <div className="h-4 w-6 bg-zinc-800 rounded" />
                <div className="h-3 w-8 bg-zinc-800/60 rounded" />
              </span>
              <span className="text-zinc-800">|</span>
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-500/40 fill-pink-500/20" />
                <div className="h-4 w-4 bg-zinc-800 rounded" />
              </span>
              <span className="text-zinc-800">|</span>
              <span className="flex items-center gap-1.5">
                <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500/40" />
                <div className="h-4 w-4 bg-zinc-800 rounded" />
              </span>
              <span className="text-zinc-800">|</span>
              <div className="h-4 w-8 bg-amber-400/20 rounded" />
            </div>
          </div>

          {/* CENTER: Roster Selector Pill */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full lg:w-auto order-1 lg:order-2">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500/40 fill-pink-500/20 shrink-0" />
            <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-zinc-900/95 border border-pink-500/30 shrink-0">
              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-pink-900/40 border border-pink-500/30 shrink-0" />
              <div className="h-4 w-32 sm:w-44 bg-zinc-800 rounded" />
              <div className="h-5 w-7 rounded-lg bg-pink-500/20" />
            </div>
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500/40 fill-pink-500/20 shrink-0" />
          </div>

          {/* RIGHT: Action Cluster */}
          <div className="flex items-center justify-center lg:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto order-3 shrink-0">
            {[SlidersHorizontal, Volume2, Sparkles, Trophy, Shuffle, Trash2, HelpCircle].map((Icon, idx) => (
              <div
                key={idx}
                className="flex h-9 w-9 sm:h-10 sm:w-10 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] items-center justify-center rounded-xl bg-zinc-900/90 border border-zinc-800/80"
              >
                <Icon className="h-4 w-4 text-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 3. MAIN ARENA 3D CARD STACK SKELETON */}
      <main className="relative flex-1 flex flex-col items-center justify-center my-2 z-20 pointer-events-none">
        <div className="relative flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px]">
          {/* DEPTH 2 QUEUE CARD SKELETON */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: 'scale(0.86) translateY(28px)',
              opacity: 0.35,
              zIndex: 5,
            }}
          >
            <div className="w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] rounded-[32px] sm:rounded-[36px] bg-zinc-950/80 border-2 border-zinc-800" />
          </div>

          {/* DEPTH 1 QUEUE CARD SKELETON */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: 'scale(0.93) translateY(14px)',
              opacity: 0.65,
              zIndex: 10,
            }}
          >
            <div className="w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] rounded-[32px] sm:rounded-[36px] bg-zinc-950/90 border-2 border-zinc-800" />
          </div>

          {/* ACTIVE PRIMARY CARD SKELETON */}
          <div className="relative z-20 w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15]">
            <div className="relative h-full w-full rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 border-pink-500/40 bg-zinc-950 shadow-[0_0_40px_rgba(255,0,85,0.2)] flex flex-col justify-between p-3.5 sm:p-4">
              {/* Shimmering portrait background */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 opacity-80" />

              {/* Top Controls Skeleton */}
              <div className="relative z-30 flex items-center justify-between">
                <div className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-zinc-900/90 border border-pink-500/30">
                  <RotateCw className="h-5 w-5 text-pink-400/40" />
                </div>
                <div className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-zinc-900/90 border border-zinc-700/80">
                  <Maximize2 className="h-5 w-5 text-zinc-500/40" />
                </div>
              </div>

              {/* Center Character Identity Placeholder */}
              <div className="relative z-30 flex flex-col items-center space-y-2 py-6">
                <div className="h-6 w-44 bg-zinc-800/90 rounded-xl border border-zinc-700/50 shadow" />
                <div className="h-4 w-28 bg-pink-500/20 rounded-lg" />
              </div>

              {/* Bottom Action Triggers Skeleton */}
              <div className="relative z-30 flex items-center justify-between">
                <div className="flex h-14 w-14 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-zinc-900/90 border-2 border-zinc-700">
                  <ThumbsDown className="h-7 w-7 text-slate-500/40" />
                </div>
                <div className="flex h-14 w-14 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-rose-950 to-pink-950 border border-pink-500/40 shadow-lg">
                  <Heart className="h-7 w-7 text-pink-500/40 fill-pink-500/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/**
 * Skeleton fallback specifically for the Hall of Fame Leaderboard Modal.
 */
export const SmashLeaderboardSkeleton: React.FC<{ count?: number; dict?: Dictionary | any; ariaLabel?: string }> = ({ count = 6, dict, ariaLabel }) => {
  const loadingLabel = ariaLabel || dict?.smashOrPass?.loadingRankings || dict?.app?.loading || '';

  return (
    <div className="space-y-3 select-none animate-pulse" role="status" aria-label={loadingLabel || undefined}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3.5 sm:p-4 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 gap-3.5 sm:gap-4"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0" />
            <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-36 bg-zinc-800 rounded" />
              <div className="h-3 w-20 bg-zinc-800/60 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-6 w-20 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-5 w-12 rounded bg-pink-500/20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SmashHubSkeleton;
