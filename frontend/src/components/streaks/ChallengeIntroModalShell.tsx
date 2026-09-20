// frontend/src/components/streaks/ChallengeIntroModalShell.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

export interface ChallengeIntroTile {
  value: string;
  label: string;
  description: string;
  /** Any icon component (lucide or a custom DbdIcons SVG). */
  icon: React.ElementType;
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
  /** Any icon component (lucide or a custom DbdIcons SVG). */
  icon: React.ElementType;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/70 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-2xl bg-bg-surface border border-border-color rounded-2xl shadow-2xl overflow-hidden my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 border rounded-xl ${iconClassName}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={dict?.modal?.close || 'Close'}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {intro && (
          <div className="px-6 pb-5">
            <div className="bg-bg-elevated border border-border-color rounded-xl p-4 shadow-sm text-center">
              <p className="leading-relaxed text-xs sm:text-sm text-text-secondary">
                {intro}
              </p>
              {onOpenRules && (
                <button
                  type="button"
                  onClick={onOpenRules}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
              ? 'font-bold text-text-secondary'
              : 'font-bold text-text-primary';
            const descriptionClassName = tile.disabled
              ? 'text-xs text-text-muted text-balance'
              : 'text-xs text-text-secondary text-balance';
            const badgeClassName = 'text-[10px] font-bold uppercase tracking-wider text-text-muted';

            const content = (
              <>
                {tile.image ? (
                  <img
                    src={tile.image}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <TileIcon className={`w-6 h-6 ${tile.disabled ? 'text-text-muted' : ''}`} />
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
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border-color bg-bg-elevated/50 p-5 text-center opacity-70"
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
                  isCurrent ? 'ring-2 ring-current ring-offset-2 ring-offset-bg-surface' : ''
                }`}
              >
                {tile.completed && tile.completedFull ? (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-accent-red/50 bg-accent-red/15 px-1.5 py-0.5 text-accent-red shadow-sm">
                    <AdeptBadgeIcon className="h-3 w-3" />
                    {tile.completedFullCount != null && (
                      <span className="text-[10px] font-black leading-none">{tile.completedFullCount}</span>
                    )}
                  </span>
                ) : tile.completed ? (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-accent-amber/40 bg-accent-amber/15 px-1.5 py-0.5 text-accent-amber shadow-sm">
                    <AdeptBadgeIcon className="h-3 w-3" />
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
