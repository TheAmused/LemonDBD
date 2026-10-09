// frontend/src/components/streaks/ChallengeIntroModalShell.tsx
'use client';

import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { toneFromIconClass } from '@/components/streaks/RulesModalShell';
import { AdeptBadgeIcon } from '@/components/icons/DbdIcons';
import { HEADER_BUTTON_CLASSES } from './ChallengePanel';
import { useDictionary } from "@/context/DictionaryContext";

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
  /** What sets the highlighted tile apart, shown under the intro. */
  detail?: string;
  rulesLabel?: string;
  onOpenRules?: () => void;
  tiles: ChallengeIntroTile[];
  /** A tile was clicked: it is only highlighted until the player accepts. */
  onPickTile: (value: string) => void;
  /** The highlighted tile, waiting to be accepted. */
  pendingValue?: string;
  onAccept: () => void;
  acceptLabel: string;
  acceptDisabled: boolean;
  tileGridClassName: string;
  escapeDisabled?: boolean;
  /** The mode that is active right now, marked with the "Current" label. */
  selectedValue?: string;
  currentLabel: string;
  /** Set on a second-level screen to show a back arrow next to the title. */
  onBack?: () => void;
  backLabel?: string;
}

export const ChallengeIntroModalShell: React.FC<ChallengeIntroModalShellProps> = ({
      isOpen,
      onClose,
      icon: Icon,
      iconClassName,
      title,
      intro,
      detail,
      rulesLabel,
      onOpenRules,
      tiles,
      onPickTile,
      pendingValue,
      onAccept,
      acceptLabel,
      acceptDisabled,
      tileGridClassName,
      escapeDisabled,
      selectedValue,
      currentLabel,
      onBack,
      backLabel,
    }) => {
  const dict = useDictionary();
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
      centerTitle
      closeButtonAriaLabel={dict.modal.close}
      headerLeft={
        onBack ? (
          <Button
            variant="ghost"
            size="md"
            icon
            onClick={onBack}
            aria-label={backLabel || 'Back'}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        ) : undefined
      }
      bodyClassName="p-5 sm:p-6"
      footerClassName="justify-center"
      footer={
        <Button variant="primary" size="md" onClick={onAccept} disabled={acceptDisabled} className="min-w-40">
          {acceptLabel}
        </Button>
      }
    >
      {(intro || detail || onOpenRules) && (
        <div className="flex flex-col items-center gap-3 pb-5 text-center">
          {intro && <p className="type-body-fluid font-semibold text-text-primary">{intro}</p>}
          {detail && (
            <p className="type-body-fluid text-text-secondary border-t border-border-color pt-3 w-full">
              {detail}
            </p>
          )}
          {onOpenRules && (
            <button
              type="button"
              onClick={onOpenRules}
              className={`${HEADER_BUTTON_CLASSES} gap-1.5 px-3 py-2 text-xs font-bold`}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {rulesLabel}
            </button>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${tileGridClassName}`}>
        {tiles.map((tile) => {
          const TileIcon = tile.icon;
          const isCurrent = tile.value === selectedValue;
          const isPending = tile.value === pendingValue;
          const labelClassName = tile.disabled
            ? 'font-bold text-text-secondary'
            : 'font-bold text-text-primary';
          const badgeClassName = 'text-tiny font-bold uppercase tracking-wider text-text-muted';

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
              onClick={() => onPickTile(tile.value)}
              aria-pressed={isPending}
              className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-6 sm:p-7 text-center transition-colors cursor-pointer ${tile.accentClassName} ${
                isPending ? 'ring-2 ring-accent-red ring-offset-2 ring-offset-bg-surface' : ''
              }`}
            >
              {tile.completed && tile.completedFull ? (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-accent-red/50 bg-accent-red/15 px-1.5 py-0.5 text-accent-red shadow-sm">
                  <AdeptBadgeIcon className="h-3 w-3" />
                  {tile.completedFullCount != null && (
                    <span className="text-tiny font-black leading-none">{tile.completedFullCount}</span>
                  )}
                </span>
              ) : tile.completed ? (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-accent-amber/40 bg-accent-amber/15 px-1.5 py-0.5 text-accent-amber shadow-sm">
                  <AdeptBadgeIcon className="h-3 w-3" />
                  {tile.completedCount != null && (
                    <span className="text-tiny font-black leading-none">{tile.completedCount}</span>
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
