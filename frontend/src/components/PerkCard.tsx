'use client';
// frontend/src/components/PerkCard.tsx

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ImageOff, Lock, HelpCircle } from 'lucide-react';
import { Perk, PerkDictionary } from '@/types/perks';
import { getPerkIconUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { DisabledBadge } from '@/components/DisabledBadge';
import { UnifiedHoverModal, ActiveHoverState } from '@/components/common/UnifiedHoverModal';

const DisabledReasonModal = dynamic(
  () => import('@/components/DisabledReasonModal').then((m) => m.DisabledReasonModal),
  { ssr: false }
);

export type { Perk };

const GRID_SIZE_CLASSES: Record<'default' | 'large' | 'fill' | 'tarot' | 'compact' | 'wheelFlank', string> = {
  default: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-44 xl:w-44 2xl:h-52 2xl:w-52 min-[1800px]:h-60 min-[1800px]:w-60',
  large: 'h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-44 lg:w-44 xl:h-52 xl:w-52 2xl:h-60 2xl:w-60 min-[1800px]:h-68 min-[1800px]:w-68 wide:h-76 wide:w-76 wide-2k:h-88 wide-2k:w-88 wide-4k:h-96 wide-4k:w-96',
  fill: 'h-[min(88cqh,88cqw)] w-[min(88cqh,88cqw)] max-h-48 max-w-48',
  tarot: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-48 xl:w-48 2xl:h-56 2xl:w-56 wide:h-64 wide:w-64 wide-2k:h-72 wide-2k:w-72 wide-4k:h-80 wide-4k:w-80',
  compact: 'h-[78px] w-[78px] xs:h-[84px] xs:w-[84px] sm:h-24 sm:w-24 md:h-26 md:w-26',
  wheelFlank: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-36 xl:w-36 2xl:h-44 2xl:w-44 wide:h-52! wide:w-52! wide-2k:h-60! wide-2k:w-60! wide-4k:h-72! wide-4k:w-72!',
};

interface PerkCardProps {
  perk: Perk;
  onSelect: (perk: Perk) => void;
  dict?: PerkDictionary;
  coordinate?: { page: number; slot: number };
  size?: 'default' | 'large' | 'fill' | 'tarot' | 'compact' | 'wheelFlank';
  isBlind?: boolean;
}

export const PerkCard: React.FC<PerkCardProps> = ({
  perk,
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

  return (
    <div
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
                ? 'top-0 left-0 text-[8px] sm:text-[9px] md:text-[10px] xl:text-xs 2xl:text-sm text-accent-amber bg-bg-primary/80 px-1 py-0.5 rounded shadow-xs'
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
              className={`h-full w-full object-contain filter drop-shadow-xl ${
                size === 'tarot' || size === 'compact'
                  ? 'group-hover:drop-shadow-[0_0_6px_var(--accent-red)]'
                  : 'group-hover:drop-shadow-[0_0_8px_var(--accent-red)]'
              } transition-all duration-200 pointer-events-none`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-3/4 w-3/4 rotate-45 items-center justify-center rounded-xl bg-bg-elevated border border-border-color">
              <ImageOff className="-rotate-45 h-10 w-10 text-text-muted" />
            </div>
          )}

          {avatarSrc && !avatarError && !isGeneral && (
            <div
              className={`absolute bottom-0 right-0 overflow-hidden rounded-full pointer-events-none bg-bg-primary shadow-lg border border-border-color ${
                size === 'compact'
                  ? 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7'
                  : size === 'tarot'
                    ? 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 wide:h-14 wide:w-14'
                    : size === 'fill'
                      /* The perk icon itself scales with the grid cell via
                         container query units (h-[min(88cqh,88cqw)] on the
                         button above). A fixed-pixel avatar badge doesn't
                         shrink with it, so on a small cell (many perks per
                         page, a narrow column) the badge ends up as big as
                         or bigger than the diamond and hides it entirely.
                         Sizing the badge off the same cq units keeps it a
                         constant, small fraction of the perk icon -- which
                         always stays the dominant, legible element. */
                      ? 'h-[min(30cqh,30cqw)] w-[min(30cqh,30cqw)] max-h-14 max-w-14'
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
              className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-primary/90 shadow-xs border border-border-color"
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

