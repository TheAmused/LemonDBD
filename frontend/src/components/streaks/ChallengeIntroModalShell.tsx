// frontend/src/components/streaks/ChallengeIntroModalShell.tsx
'use client';

import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { toneFromIconClass } from '@/components/streaks/RulesModalShell';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';

export const NEUTRAL_TILE_ACCENT = 'border-border-color bg-bg-elevated hover:bg-bg-elevated/80 text-text-secondary';

export interface ChallengeIntroTile {
  value: string;
  label: string;
  description?: string;
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
  /** Any icon component (lucide or a custom DbdIcons SVG). Omit to show a plain text title with no icon box. */
  icon?: React.ElementType;
  iconClassName?: string;
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
  /** Set on a second-level screen to show a back arrow next to the title. */
  onBack?: () => void;
  backLabel?: string;
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
  onBack,
  backLabel,
  dict,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="2xl"
      closeOnEscape={!escapeDisabled}
      tone={toneFromIconClass(iconClassName)}
      icon={Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : undefined}
      title={title}
      closeButtonAriaLabel={dict?.modal?.close || 'Close'}
      headerLeft={
        onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel || 'Back'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary cursor-pointer sm:h-10 sm:w-10"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : undefined
      }
      bodyClassName="p-5 sm:p-6"
    >
      {intro && (
        <div className="pb-5">
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

      <div className={`grid grid-cols-1 gap-4 ${tileGridClassName}`}>
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
                  className="w-full max-w-[10rem] aspect-square rounded-xl object-cover shadow-sm"
                />
              ) : (
                <TileIcon className={`w-6 h-6 ${tile.disabled ? 'text-text-muted' : ''}`} />
              )}
              <span className={labelClassName}>{tile.label}</span>
              {tile.description && <span className={descriptionClassName}>{tile.description}</span>}
              {isCurrent && <span className={`${badgeClassName} text-current`}>{currentLabel}</span>}
              {tile.disabledBadge && <span className={badgeClassName}>{tile.disabledBadge}</span>}
            </>
          );

          if (tile.disabled) {
            return (
              <div
                key={tile.value}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border-color bg-bg-elevated/50 p-6 text-center opacity-70"
              >
                {content}
              </div>
            );
          }

          return (
            <button
              key={tile.value}
              onClick={() => onSelectTile(tile.value)}
              className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-6 sm:p-7 text-center transition-colors cursor-pointer ${tile.accentClassName} ${
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
    </Modal>
  );
};
