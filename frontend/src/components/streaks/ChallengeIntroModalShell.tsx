// frontend/src/components/streaks/ChallengeIntroModalShell.tsx
'use client';

import React, { useEffect } from 'react';
import { X, Lock, BookOpen, type LucideIcon } from 'lucide-react';

export interface ChallengeIntroTile {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Themed artwork for this tile; falls back to `icon` when absent. */
  image?: string;
  /** Tailwind border/background/hover classes for the tile button. */
  accentClassName: string;
  disabled?: boolean;
  /** Short badge shown on a disabled tile, e.g. "Coming soon." */
  disabledBadge?: string;
}

export interface ChallengeIntroModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  /** Tailwind classes for the header icon chip, e.g. "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400". */
  iconClassName: string;
  title: string;
  /** Short, 2 to 4 sentence description of the challenge concept. */
  intro: string;
  rulesLabel: string;
  onOpenRules: () => void;
  tiles: ChallengeIntroTile[];
  onSelectTile: (value: string) => void;
  /** Tailwind grid-cols classes for the tile row, e.g. "sm:grid-cols-3". */
  tileGridClassName: string;
  /** Suppress this shell's own Escape handler, e.g. while a child rules modal is open on top of it. */
  escapeDisabled?: boolean;
}

/**
 * Shared chrome for every streak mode's intro + difficulty picker screen
 * (Gauntlet/Chaos/History/Page Streak): backdrop, header, a short concept
 * paragraph with a link to the full rules, and a row of mode/difficulty
 * tiles. Each mode only supplies its own copy, tile data, and colors,
 * instead of re-declaring this same backdrop/header/tile markup four times.
 */
export const ChallengeIntroModalShell: React.FC<ChallengeIntroModalShellProps> = ({
  isOpen,
  onClose,
  icon: Icon,
  iconClassName,
  title,
  intro,
  rulesLabel,
  onOpenRules,
  tiles,
  onSelectTile,
  tileGridClassName,
  escapeDisabled,
}) => {
  useEffect(() => {
    if (!isOpen || escapeDisabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, escapeDisabled, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 border rounded-xl ${iconClassName}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-5">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm text-center">
            <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {intro}
            </p>
            <button
              type="button"
              onClick={onOpenRules}
              className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {rulesLabel}
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 px-6 pb-6 ${tileGridClassName}`}>
          {tiles.map((tile) => {
            const TileIcon = tile.icon;
            const content = (
              <>
                {tile.image ? (
                  <img
                    src={tile.image}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <TileIcon className="w-6 h-6" />
                )}
                <span className="font-bold text-slate-900 dark:text-white">{tile.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{tile.description}</span>
              </>
            );

            if (tile.disabled) {
              return (
                <div
                  key={tile.value}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-5 text-center opacity-70"
                >
                  <Lock className="w-6 h-6 text-slate-400" />
                  <span className="font-bold text-slate-500 dark:text-slate-400">{tile.label}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{tile.description}</span>
                  {tile.disabledBadge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {tile.disabledBadge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <button
                key={tile.value}
                onClick={() => onSelectTile(tile.value)}
                className={`group flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-colors cursor-pointer ${tile.accentClassName}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
