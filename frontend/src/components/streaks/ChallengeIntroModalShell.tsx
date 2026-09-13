// frontend/src/components/streaks/ChallengeIntroModalShell.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { X, BookOpen, Trophy, type LucideIcon } from 'lucide-react';

export interface ChallengeIntroTile {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  image?: string;
  accentClassName: string;
  disabled?: boolean;
  disabledBadge?: string;
  /** This tier has already been fully cleared -- shows a small trophy badge. */
  completed?: boolean;
  /** Killer count frozen at that completion, shown next to the gold badge. */
  completedCount?: number | null;
  /** Upgrades the badge to red -- cleared with the entire game roster. */
  completedFull?: boolean;
  /** Killer count frozen at that full-roster completion, shown next to the badge. */
  completedFullCount?: number | null;
}

export interface ChallengeIntroModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  /** Omit to skip the explanatory intro box entirely, e.g. when a player is
   *  just switching difficulty mid-run and already knows how the mode works. */
  intro?: string;
  rulesLabel?: string;
  onOpenRules?: () => void;
  tiles: ChallengeIntroTile[];
  onSelectTile: (value: string) => void;
  tileGridClassName: string;
  escapeDisabled?: boolean;
  selectedValue?: string;
  currentLabel: string;
  dict?: Dictionary;
}

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
  selectedValue,
  currentLabel,
  dict,
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
            aria-label={dict?.modal?.close || 'Close'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {intro && (
          <div className="px-6 pb-5">
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm text-center">
              <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                {intro}
              </p>
              {onOpenRules && (
                <button
                  type="button"
                  onClick={onOpenRules}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {rulesLabel}
                </button>
              )}
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 gap-4 px-6 pb-6 ${tileGridClassName}`}>
          {tiles.map((tile) => {
            const TileIcon = tile.icon;
            const isCurrent = tile.value === selectedValue;
            const labelClassName = tile.disabled
              ? 'font-bold text-slate-500 dark:text-slate-400'
              : 'font-bold text-slate-900 dark:text-white';
            const descriptionClassName = tile.disabled
              ? 'text-xs text-slate-400 dark:text-slate-500 text-balance'
              : 'text-xs text-slate-500 dark:text-slate-400 text-balance';
            const badgeClassName = 'text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500';

            const content = (
              <>
                {tile.image ? (
                  <img
                    src={tile.image}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <TileIcon className={`w-6 h-6 ${tile.disabled ? 'text-slate-400' : ''}`} />
                )}
                <span className={labelClassName}>{tile.label}</span>
                <span className={descriptionClassName}>{tile.description}</span>
                {isCurrent && <span className={`${badgeClassName} text-current`}>{currentLabel}</span>}
                {tile.disabledBadge && <span className={badgeClassName}>{tile.disabledBadge}</span>}
              </>
            );

            if (tile.disabled) {
              return (
                <div
                  key={tile.value}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-5 text-center opacity-70"
                >
                  {content}
                </div>
              );
            }

            return (
              <button
                key={tile.value}
                onClick={() => onSelectTile(tile.value)}
                className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-colors cursor-pointer ${tile.accentClassName} ${
                  isCurrent ? 'ring-2 ring-current ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''
                }`}
              >
                {tile.completed && tile.completedFull ? (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-red-500/50 bg-red-100 dark:bg-red-950/70 px-1.5 py-0.5 text-red-600 dark:text-red-400 shadow-sm">
                    <Trophy className="h-3 w-3" />
                    {tile.completedFullCount != null && (
                      <span className="text-[10px] font-black leading-none">{tile.completedFullCount}</span>
                    )}
                  </span>
                ) : tile.completed ? (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-100 dark:bg-yellow-950/60 px-1.5 py-0.5 text-yellow-600 dark:text-yellow-400 shadow-sm">
                    <Trophy className="h-3 w-3" />
                    {tile.completedCount != null && (
                      <span className="text-[10px] font-black leading-none">{tile.completedCount}</span>
                    )}
                  </span>
                ) : null}
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
