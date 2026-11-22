// frontend/src/components/characters/CharacterOwnershipOverlay.tsx
import React from 'react';

import { Img } from '@/components/common/Img';

export interface OwnershipClipOverlayProps {
  isOwned: boolean;
  isPartial: boolean;
  imageSrc?: string;
  /** Extra classes for the grey copy of the picture, so it can sit exactly over a shifted portrait. */
  imageClassName?: string;
}

/** The grayscale-clip + dark-scrim treatment for a locked or partially-owned
 * item: fully desaturated and dimmed when fully locked, or muted on the left
 * half / full color showing through on the right half when partially owned.
 * Pure visual, no badges: owned reads from the colour. Shared by the character
 * cards, the onboarding legend and the chapter banners so "partially owned"
 * reads identically everywhere a set of characters can be partly unlocked. */
export const OwnershipClipOverlay: React.FC<OwnershipClipOverlayProps> = ({
  isOwned,
  isPartial,
  imageSrc,
  imageClassName = '',
}) => {
  if (isOwned) return null;

  return (
    <>
      {imageSrc && (
        <Img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover object-top grayscale pointer-events-none ${imageClassName}`}
          style={{ clipPath: isPartial ? 'inset(0 50% 0 0)' : 'inset(0 0 0 0)' }}
        />
      )}
      {!isPartial && <div className="absolute inset-0 bg-bg-primary/60" />}
      {isPartial && <div className="absolute inset-y-0 left-0 w-1/2 bg-bg-primary/60" />}
    </>
  );
};
