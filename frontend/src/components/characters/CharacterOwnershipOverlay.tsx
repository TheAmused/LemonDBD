// frontend/src/components/characters/CharacterOwnershipOverlay.tsx
import React from 'react';
import { Lock, Check } from 'lucide-react';

export interface OwnershipClipOverlayProps {
  isOwned: boolean;
  isPartial: boolean;
  imageSrc?: string;
}

/** The grayscale-clip + dark-scrim treatment for a locked or partially-owned
 * item: fully desaturated and dimmed when fully locked, or muted on the left
 * half / full color showing through on the right half when partially owned.
 * Pure visual, no badges -- shared by character portraits
 * (CharacterOwnershipOverlay below) and chapter banners so "partially owned"
 * reads identically everywhere a set of characters can be partly unlocked. */
export const OwnershipClipOverlay: React.FC<OwnershipClipOverlayProps> = ({
  isOwned,
  isPartial,
  imageSrc,
}) => {
  if (isOwned) return null;

  return (
    <>
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top grayscale pointer-events-none"
          style={{ clipPath: isPartial ? 'inset(0 50% 0 0)' : 'inset(0 0 0 0)' }}
        />
      )}
      {!isPartial && <div className="absolute inset-0 bg-bg-primary/60" />}
      {isPartial && <div className="absolute inset-y-0 left-0 w-1/2 bg-bg-primary/60" />}
    </>
  );
};

export interface CharacterOwnershipOverlayProps {
  isOwned: boolean;
  hasPartialPerks: boolean;
  avatarSrc?: string;
  lockedTitle?: string;
  ownedTitle?: string;
  badgeSize?: 'xs' | 'sm' | 'md';
}

/** The exact badge + grayscale/dim overlay treatment used for a character
 * card's ownership state (owned / locked / partially unlocked). Shared
 * between CharactersHub's real ownership grid and the onboarding wizard's
 * legend/example images, so both always look identical. */
export const CharacterOwnershipOverlay: React.FC<CharacterOwnershipOverlayProps> = ({
  isOwned,
  hasPartialPerks,
  avatarSrc,
  lockedTitle,
  ownedTitle,
  badgeSize = 'md',
}) => {
  const badgeClasses =
    badgeSize === 'xs'
      ? 'top-1 left-1 h-4 w-4'
      : badgeSize === 'sm'
      ? 'top-1 left-1 sm:top-1.5 sm:left-1.5 h-5 w-5 sm:h-6 sm:w-6'
      : 'top-1.5 left-1.5 sm:top-2 sm:left-2 h-6 w-6 sm:h-7 sm:w-7';

  const iconClasses =
    badgeSize === 'xs'
      ? 'h-2.5 w-2.5'
      : badgeSize === 'sm'
      ? 'h-2.5 w-2.5 sm:h-3 sm:w-3'
      : 'h-3 w-3 sm:h-3.5 sm:w-3.5';

  return (
    <>
      {!isOwned && (
        <div
          className={`absolute ${badgeClasses} z-10 flex items-center justify-center rounded-full bg-bg-surface/90 border border-accent-amber text-accent-amber shadow-xs backdrop-blur-md`}
          title={lockedTitle}
        >
          <Lock className={iconClasses} />
        </div>
      )}
      {isOwned && (
        <div
          className={`absolute ${badgeClasses} z-10 flex items-center justify-center rounded-full bg-accent-green/20 border border-accent-green/40 text-accent-green backdrop-blur-md shadow-xs`}
          title={ownedTitle}
        >
          <Check className={iconClasses} />
        </div>
      )}
      <OwnershipClipOverlay isOwned={isOwned} isPartial={hasPartialPerks} imageSrc={avatarSrc} />
    </>
  );
};

export default CharacterOwnershipOverlay;
