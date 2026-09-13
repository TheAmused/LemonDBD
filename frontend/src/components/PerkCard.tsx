'use client';
// frontend/src/components/PerkCard.tsx

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ImageOff, Lock, HelpCircle } from 'lucide-react';
import { Perk, PerkDictionary, ViewDisplayMode } from '@/types/perks';
import { getPerkIconUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { DisabledBadge } from '@/components/DisabledBadge';
import { UnifiedHoverModal, ActiveHoverState } from '@/components/common/UnifiedHoverModal';

const DisabledReasonModal = dynamic(
  () => import('@/components/DisabledReasonModal').then((m) => m.DisabledReasonModal),
  { ssr: false }
);

export type { Perk };

const GRID_SIZE_CLASSES: Record<'default' | 'large' | 'fill' | 'tarot' | 'compact', string> = {
  default: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-44 xl:w-44 2xl:h-52 2xl:w-52 min-[1800px]:h-60 min-[1800px]:w-60',
  large: 'h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:h-44 lg:h-44 lg:w-44 xl:h-52 xl:w-52 2xl:h-60 2xl:w-60 min-[1800px]:h-68 min-[1800px]:w-68',
  fill: 'h-[min(88cqh,88cqw)] w-[min(88cqh,88cqw)] max-h-48 max-w-48',
  tarot: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-44 xl:w-44 2xl:h-52 2xl:w-52 min-[1800px]:h-60 min-[1800px]:w-60',
  compact: 'h-[78px] w-[78px] xs:h-[84px] xs:w-[84px] sm:h-24 sm:w-24 md:h-26 md:w-26',
};

interface PerkCardProps {
  perk: Perk;
  viewMode?: ViewDisplayMode;
  onSelect: (perk: Perk) => void;
  dict?: PerkDictionary;
  coordinate?: { page: number; slot: number };
  size?: 'default' | 'large' | 'fill' | 'tarot' | 'compact';
  isBlind?: boolean;
}

export const PerkCard: React.FC<PerkCardProps> = ({
  perk,
  viewMode = 'grid',
  onSelect,
  dict,
  coordinate,
  size = 'default',
  isBlind = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const [activeHover, setActiveHover] = useState<ActiveHoverState | null>(null);

  const iconSrc = getPerkIconUrl(perk);
  const avatarSrc = getCharacterAvatarUrl(
    perk,
    perk.category === 'Killer' ? 'Killer' : 'Survivor'
  );

  const isGeneral =
    !perk.character ||
    perk.character === 'General' ||
    Boolean(perk.is_generic_counterpart);
  const isOwned = perk.is_owned !== false;

  const generalLabel = dict?.modal?.generalPerk;
  const roleLabel =
    perk.category === 'Killer'
      ? dict?.modal?.killerPerk
      : dict?.modal?.survivorPerk;

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveHover({ item: perk, rect });
  };
  const handleMouseLeave = () => setActiveHover(null);
  const ariaLabel = `${perk.name}${isGeneral ? (generalLabel ? ` - ${generalLabel}` : '') : (perk.character ? ` - ${perk.character}` : '')}`;

  const coordinateLabel = coordinate
    ? `${dict?.generator?.coordOpenPage || '['}${coordinate.page}${dict?.generator?.coordSlot || '/'}${coordinate.slot}${dict?.generator?.coordClose || ']'}`
    : null;

  if (isBlind) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-2 p-2 ${GRID_SIZE_CLASSES[size]}`}
      >
        {coordinateLabel && (
          <span className="absolute top-1 left-1 z-10 font-mono text-[10px] font-black text-accent-amber">
            {coordinateLabel}
          </span>
        )}
        <HelpCircle className="h-10 w-10 text-text-muted" />
        {dict?.generator?.hiddenPerkLabel && (
          <span className="text-[11px] font-bold text-text-muted text-center px-2">
            {dict.generator.hiddenPerkLabel}
          </span>
        )}
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div key={viewMode} className="relative group flex w-full items-center">
        <button
          type="button"
          onClick={() => onSelect(perk)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={ariaLabel}
          className="relative flex w-full items-center gap-3 sm:gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 px-3 py-2 sm:px-4 sm:py-3 min-h-[48px] touch-manipulation text-left cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-amber-500/40 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
        >
          <div
            className={`relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-border-color p-1 ${
              perk.is_disabled ? 'opacity-50 grayscale' : !isOwned ? 'opacity-40 grayscale' : ''
            }`}
          >
            {!imgError && iconSrc ? (
              <img
                src={iconSrc}
                alt={perk.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] pointer-events-none"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-xl bg-slate-900 border border-border-color">
                <ImageOff className="-rotate-45 h-5 w-5 text-text-muted" />
              </div>
            )}

            {avatarSrc && !avatarError && !isGeneral && (
              <div className="absolute bottom-0 right-0 h-5 w-5 sm:h-6 sm:w-6 overflow-hidden rounded-full pointer-events-none bg-slate-950 shadow-lg border border-border-color">
                <img
                  src={avatarSrc}
                  alt={perk.character}
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {coordinateLabel && (
                <span className="shrink-0 font-mono text-[10px] font-black text-amber-700 dark:text-amber-400/90">
                  {coordinateLabel}
                </span>
              )}
              <p className="truncate text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{perk.name}</p>
            </div>
            <p className="truncate text-xs text-text-secondary">
              {isGeneral ? generalLabel : perk.character}
              {roleLabel && ` · ${roleLabel}`}
            </p>
          </div>

          {!perk.is_disabled && !isOwned && (
            <Lock
              className="h-4 w-4 shrink-0 text-text-muted"
              aria-label={dict?.modal?.unownedPerk}
            />
          )}
        </button>

        {perk.is_disabled && (
          <DisabledBadge label={perk.name} onClick={() => setShowDisabledModal(true)} />
        )}

        <DisabledReasonModal
          isOpen={showDisabledModal}
          onClose={() => setShowDisabledModal(false)}
          label={perk.name}
          reason={perk.disabled_reason}
        />

        <UnifiedHoverModal
          activeHover={activeHover}
          placement="auto"
          t={dict?.modal as unknown as Record<string, string>}
          isPerk={true}
        />
      </div>
    );
  }

  return (
    <div
      key={viewMode}
      className={
        size === 'fill'
          ? 'relative group flex h-full w-full items-center justify-center p-1 [container-type:size]'
          : size === 'tarot' || size === 'compact'
            ? 'relative group flex items-center justify-center p-0.5 w-full'
            : 'relative group flex items-center justify-center p-2 sm:p-3 w-full'
      }
    >
      <button
        type="button"
        onClick={() => onSelect(perk)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={ariaLabel}
        className={`relative flex cursor-pointer items-center justify-center transition-transform duration-200 ${
          size === 'tarot' || size === 'compact' ? 'group-hover:scale-102 active:scale-95' : 'group-hover:scale-105 active:scale-95'
        } touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red rounded-2xl ${GRID_SIZE_CLASSES[size]}`}
      >
        {coordinateLabel && (
          <span
            className={`absolute z-10 font-mono font-black pointer-events-none ${
              size === 'tarot' || size === 'compact'
                ? 'top-0 left-0 text-[8px] sm:text-[9px] md:text-[10px] text-accent-amber bg-slate-950/80 px-1 py-0.5 rounded shadow-xs'
                : 'top-1 left-1 text-[10px] text-accent-amber'
            }`}
          >
            {coordinateLabel}
          </span>
        )}

        <div
          className={`relative flex h-full w-full items-center justify-center ${
            perk.is_disabled ? 'opacity-50 grayscale' : !isOwned ? 'opacity-40 grayscale' : ''
          }`}
        >
          {!imgError && iconSrc ? (
            <img
              src={iconSrc}
              alt={perk.name}
              onError={() => setImgError(true)}
              className={`h-full w-full object-contain filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)] ${
                size === 'tarot' || size === 'compact'
                  ? 'group-hover:drop-shadow-[0_0_12px_var(--accent-red)]'
                  : 'group-hover:drop-shadow-[0_0_18px_var(--accent-red)]'
              } transition-all duration-200 pointer-events-none`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-xl bg-slate-900 border border-border-color">
              <ImageOff className="-rotate-45 h-10 w-10 text-text-muted" />
            </div>
          )}

          {avatarSrc && !avatarError && !isGeneral && (
            <div
              className={`absolute bottom-0 right-0 overflow-hidden rounded-full pointer-events-none bg-slate-950 shadow-lg border border-border-color ${
                size === 'tarot' || size === 'compact'
                  ? 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7'
                  : 'h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-13 lg:w-13'
              }`}
            >
              <img
                src={avatarSrc}
                alt={perk.character}
                onError={() => setAvatarError(true)}
                className="h-full w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </div>
          )}
        </div>

        {perk.is_disabled ? (
          <DisabledBadge label={perk.name} onClick={() => setShowDisabledModal(true)} />
        ) : (
          !isOwned && (
            <div
              className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/90 shadow-xs border border-border-color"
              title={dict?.modal?.unownedPerk}
            >
              <Lock className="h-3.5 w-3.5 text-text-muted" />
            </div>
          )
        )}
      </button>

      <DisabledReasonModal
        isOpen={showDisabledModal}
        onClose={() => setShowDisabledModal(false)}
        label={perk.name}
        reason={perk.disabled_reason}
      />

      <UnifiedHoverModal
        activeHover={activeHover}
        placement="auto"
        t={dict?.modal as unknown as Record<string, string>}
        isPerk={true}
      />
    </div>
  );
};

