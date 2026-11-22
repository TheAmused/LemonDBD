'use client';
// frontend/src/components/PerkCard.tsx

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { HelpCircle } from 'lucide-react';
import type { Perk } from '@/types/perks';
import { getPerkIconThumbUrl, getPerkIconUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { avatarThumbFromPath } from '@/utils/thumbUrl';
import { DisabledBadge } from '@/components/DisabledBadge';

import { tip } from '@/components/common/Tooltip';
import { useDictionary } from "@/context/DictionaryContext";
import { Badge } from '@/components/common/Badge';
import { TileButton } from '@/components/common/TileButton';
import { Img } from '@/components/common/Img';
import { LockIcon } from '@/components/icons/DbdIcons';

const DisabledReasonModal = dynamic(
  () => import('@/components/DisabledReasonModal').then((m) => m.DisabledReasonModal),
  { ssr: false }
);
const GRID_SIZE_CLASSES: Record<'default' | 'large' | 'fill' | 'tarot' | 'compact' | 'wheelFlank', string> = {
  default: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-44 xl:w-44 2xl:h-52 2xl:w-52 wide:h-60 wide:w-60',
  large: 'h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44 lg:h-44 lg:w-44 xl:h-52 xl:w-52 2xl:h-60 2xl:w-60 wide:h-68 wide:w-68 wide:h-76 wide:w-76 wide-2k:h-88 wide-2k:w-88 wide-4k:h-96 wide-4k:w-96',
  fill: 'h-[min(88cqh,88cqw)] w-[min(88cqh,88cqw)] max-h-48 max-w-48',
  tarot: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-48 xl:w-48 2xl:h-56 2xl:w-56 wide:h-64 wide:w-64 wide-2k:h-72 wide-2k:w-72 wide-4k:h-80 wide-4k:w-80',
  compact: 'h-22 w-22 phone:h-24 phone:w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36',
  wheelFlank: 'h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-36 xl:w-36 2xl:h-44 2xl:w-44 wide:h-52! wide:w-52! wide-2k:h-60! wide-2k:w-60! wide-4k:h-72! wide-4k:w-72!',
};

const FIXED_SIZES: ReadonlyArray<keyof typeof GRID_SIZE_CLASSES> = ['default', 'large', 'wheelFlank'];

/** The icon of a named fill card: leaves the lower part of the cell for the name. */
const NAMED_ICON_CLASS = 'h-[min(64cqh,88cqw)] w-[min(64cqh,88cqw)] max-h-40 max-w-40 shrink-0';

interface PerkCardProps {
  perk: Perk;
  onSelect: (perk: Perk) => void;
  coordinate?: { page: number; slot: number };
  size?: 'default' | 'large' | 'fill' | 'tarot' | 'compact' | 'wheelFlank';
  isBlind?: boolean;
  /** Print the perk name under the icon. On a fixed-size card it is drawn inside the same square, so the card keeps its footprint. */
  showName?: boolean;
  /** Grey icon (colour comes back when the prop is dropped); a hover glow keeps its own colour. */
  muted?: boolean;
}

export const PerkCard: React.FC<PerkCardProps> = ({ perk, onSelect, coordinate, size = 'default', isBlind = false, showName = false, muted = false }) => {
  const dict = useDictionary();
  const [avatarError, setAvatarError] = useState(false);
  const [showDisabledModal, setShowDisabledModal] = useState(false);

  // Fixed-size cards are drawn at 96 to 240px (more on a sharp screen), so they take the full icon, as the detail view does; the small cells of a grid take the light thumbnail.
  const iconSrc = size === 'fill' ? getPerkIconThumbUrl(perk, 128) : getPerkIconUrl(perk);
  const rawAvatarSrc = getCharacterAvatarUrl(
    perk,
    perk.category === 'Killer' ? 'Killer' : 'Survivor'
  );
  const avatarSrc = (rawAvatarSrc && avatarThumbFromPath(rawAvatarSrc, 128)) || rawAvatarSrc;

  const isGeneral =
    !perk.character ||
    perk.character === 'General' ||
    Boolean(perk.is_generic_counterpart);
  const isOwned = perk.is_owned !== false;
  // On a fixed-size card the icon steps back a little when the character portrait sits in its corner, so the two do not overlap (by size, not by a scale transform: that resamples the picture and softens it).
  const showAvatar = Boolean(avatarSrc) && !avatarError && !isGeneral;

  const named = showName && size === 'fill';
  // Fixed-size cards (every size but fill) print the name inside their square, under a smaller icon.
  const inlineName = showName && size !== 'fill';
  const generalLabel = dict.modal.generalPerk;
  const ariaLabel = `${perk.name}${isGeneral ? (generalLabel ? ` - ${generalLabel}` : '') : (perk.character ? ` - ${perk.character}` : '')}`;

  const coordinateLabel = coordinate
    ? `${dict.generator.coordOpenPage}${coordinate.page}${dict.generator.coordSlot}${coordinate.slot}${dict.generator.coordClose}`
    : null;

  if (isBlind) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-2 p-2 ${GRID_SIZE_CLASSES[size]}`}
      >
        {coordinateLabel && (
          <span className="absolute top-1 left-1 z-10 type-strong-2xs text-accent-amber">
            {coordinateLabel}
          </span>
        )}
        <HelpCircle className="h-10 w-10 text-text-muted" />
        {dict.generator.hiddenPerkLabel && (
          <span className="type-strong-xs text-text-muted text-center px-2">
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
      <TileButton
        press={false}
        onClick={() => onSelect(perk)}
        aria-label={ariaLabel}
        className={`relative flex items-center justify-center duration-200 ${
          inlineName ? 'flex-col gap-0.5' : ''
        } ${
          named
            ? 'h-full w-full flex-col gap-1'
            : size === 'tarot' || size === 'compact'
              ? `group-hover:scale-102 ${GRID_SIZE_CLASSES[size]}`
              : `group-hover:scale-105 ${GRID_SIZE_CLASSES[size]}`
        } touch-manipulation rounded-control`}
      >
        {coordinateLabel && (
          <Badge
            tone="coordinate" size="xs" plain className={`absolute z-10 ${size === 'fill' ? 'top-1 left-1' : 'top-0 left-0 px-1 py-0'}`}
          >
            {coordinateLabel}
          </Badge>
        )}

        <div className={`relative flex items-center justify-center transition-transform duration-200 ${
          named
            ? `${NAMED_ICON_CLASS} group-hover:scale-105`
            : inlineName ? 'min-h-0 w-full flex-1' : 'h-full w-full'
        }`}>
          <div
            className={`relative flex h-full w-full items-center justify-center ${
              perk.is_disabled ? 'opacity-50 grayscale' : !isOwned ? 'opacity-40 grayscale' : ''
            }`}
          >
            <PerkIcon
              perk={perk}
              src={iconSrc}
              className={showAvatar && FIXED_SIZES.includes(size) ? 'h-11/12 w-11/12 self-start' : 'h-full w-full'}
              imageClassName={`h-full w-full object-contain filter drop-shadow-xl group-hover:drop-shadow-glow-red-sm transition-all duration-200 pointer-events-none ${muted ? 'grayscale' : ''}`}
            />

            {showAvatar && avatarSrc && (
              <div
                className={`absolute bottom-0 right-0 overflow-hidden rounded-full pointer-events-none bg-bg-primary shadow-lg border border-border-color transition-[filter] duration-200 ${
                  muted ? 'grayscale ' : ''
                }${
                  size === 'compact'
                    ? 'h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-11 lg:w-11'
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
                        ? named
                          ? 'h-[min(26cqh,26cqw)] w-[min(26cqh,26cqw)] max-h-12 max-w-12'
                          : 'h-[min(32cqh,32cqw)] w-[min(32cqh,32cqw)] max-h-14 max-w-14'
                        : 'h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 lg:h-13 lg:w-13'
                }`}
              >
                <Img
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

          {!perk.is_disabled && !isOwned && (
            <div
              className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-primary/90 shadow-xs border border-border-color"
              {...tip(dict.modal.unownedPerk, undefined, 'status')}
            >
              <LockIcon className="icon-sm text-text-muted" />
            </div>
          )}
        </div>

        {named && (
          <span
            className={`type-card-title line-clamp-2 w-full text-balance text-center ${
              perk.is_disabled || !isOwned ? 'text-text-muted' : 'text-text-primary'
            }`}
          >
            {perk.name}
          </span>
        )}

        {inlineName && (
          <span
            className={`line-clamp-2 w-full shrink-0 text-balance text-center font-bold leading-tight px-0.5 ${
              size === 'compact'
                ? 'text-micro'
                : size === 'tarot'
                  ? 'text-micro sm:text-tiny xl:text-mini text-tarot-ink'
                  : 'text-tiny sm:text-mini xl:text-xs wide:text-sm'
            } ${size === 'tarot' ? '' : perk.is_disabled || !isOwned ? 'text-text-muted' : 'text-text-primary'}`}
          >
            {perk.name}
          </span>
        )}

      </TileButton>

      {perk.is_disabled && (
        <DisabledBadge
          label={perk.name}
          onClick={() => setShowDisabledModal(true)}
          className="absolute top-1 right-1 z-20"
        />
      )}

      <DisabledReasonModal
        isOpen={showDisabledModal}
        onClose={() => setShowDisabledModal(false)}
        label={perk.name}
        reason={perk.disabled_reason}
      />

    </div>
  );
};

