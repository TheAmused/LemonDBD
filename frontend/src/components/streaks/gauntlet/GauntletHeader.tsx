'use client';
// frontend/src/components/streaks/gauntlet/GauntletHeader.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Role } from '@/types/gauntletStreak';
import { BarChart2, BookOpen, RotateCcw, History, Gauge } from 'lucide-react';
import { FreezeBadge } from '../FreezeBadge';

export interface GauntletHeaderProps {
  role: Role;
  currentStreak: number;
  bestStreak: number;
  lastCheckpointStreak: number;
  poolFrozen?: boolean;
  /** The lemon variant's label (e.g. "Duo"), shown next to the title. Omit for Original. */
  modeLabel?: string;
  onOpenStats: () => void;
  onOpenHistory: () => void;
  onOpenRules: () => void;
  onOpenReset: () => void;
  /** Omit to hide the button, e.g. for a role with only one playable mode. */
  onChangeMode?: () => void;
  dict?: Dictionary;
}

export const GauntletHeader: React.FC<GauntletHeaderProps> = ({
  role,
  currentStreak,
  bestStreak,
  lastCheckpointStreak,
  poolFrozen = false,
  modeLabel,
  onOpenStats,
  onOpenHistory,
  onOpenRules,
  onOpenReset,
  onChangeMode,
  dict,
}) => {
  return (
    <div className="w-full bg-bg-surface/90 border border-border-color rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-sm mb-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 justify-center sm:justify-start shrink-0">
          <img
            src="/images/streaks/gauntlet-streak.jpg"
            alt=""
            className="hidden sm:block h-8 w-8 shrink-0 rounded-lg border border-border-color object-cover shadow-sm"
          />
          <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight whitespace-nowrap">
            <span className="capitalize">{dict?.streaks?.[role] || role}</span> {dict?.streaks?.gauntlet || 'Gauntlet'}
          </h1>
          {modeLabel && (
            <span className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-amber">
              {modeLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto">
          <FreezeBadge frozen={poolFrozen} compact dict={dict} />
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
              {dict?.streaks?.current || 'Current'}
            </span>
            <span className="text-sm font-black text-text-primary font-mono">{currentStreak}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
              {dict?.streaks?.best || 'Best'}
            </span>
            <span className="text-sm font-black text-text-primary font-mono">{bestStreak}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
              {dict?.streaks?.checkpointHeader || 'Checkpoint'}
            </span>
            <span className="text-sm font-black text-text-primary font-mono">{lastCheckpointStreak}</span>
          </div>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.rules || 'Rules'}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{dict?.streaks?.rules || 'Rules'}</span>
          </button>

          {onChangeMode && (
            <button
              onClick={onChangeMode}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary hover:text-text-primary border border-border-color font-bold text-xs transition-colors shadow-sm cursor-pointer"
              title={dict?.streaks?.changeMode || 'Change Mode'}
            >
              <Gauge className="w-4 h-4" />
              <span className="hidden sm:inline">{dict?.streaks?.changeMode || 'Change Mode'}</span>
            </button>
          )}

          <button
            onClick={onOpenStats}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary border border-border-color transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.stats || 'Statistics'}
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-bg-elevated/70 text-text-secondary border border-border-color transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.pastWins || 'Past Wins'}
          >
            <History className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenReset}
            className="flex items-center justify-center p-2.5 rounded-xl bg-bg-elevated hover:bg-accent-red/10 text-text-secondary hover:text-accent-red border border-border-color transition-colors shadow-sm cursor-pointer"
            title={dict?.streaks?.resetRun || 'Reset this run'}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
