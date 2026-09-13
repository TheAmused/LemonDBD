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
      {!isPartial && <div className="absolute inset-0 bg-slate-950/50" />}
      {isPartial && <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-950/50" />}
    </>
  );
};

export interface CharacterOwnershipOverlayProps {
  isOwned: boolean;
  hasPartialPerks: boolean;
  avatarSrc?: string;
  lockedTitle?: string;
  ownedTitle?: string;
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
}) => {
  return (
    <>
      {!isOwned && (
        <div
          className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-surface border border-accent-amber text-accent-amber shadow-xs backdrop-blur-md"
          title={lockedTitle}
        >
          <Lock className="h-3.5 w-3.5" />
        </div>
      )}
      {isOwned && (
        <div
          className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 backdrop-blur-md shadow-xs"
          title={ownedTitle}
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
      <OwnershipClipOverlay isOwned={isOwned} isPartial={hasPartialPerks} imageSrc={avatarSrc} />
    </>
  );
};

export default CharacterOwnershipOverlay;
