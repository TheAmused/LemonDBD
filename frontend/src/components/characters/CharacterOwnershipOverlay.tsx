// frontend/src/components/characters/CharacterOwnershipOverlay.tsx
import React from 'react';
import { Lock, Check } from 'lucide-react';

export interface CharacterOwnershipOverlayProps {
  isOwned: boolean;
  hasPartialPerks: boolean;
  avatarSrc: string;
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
  const showLockedOverlay = !isOwned;

  return (
    <>
      {showLockedOverlay && (
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
      {showLockedOverlay && (
        <img
          src={avatarSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top grayscale pointer-events-none"
          style={{ clipPath: hasPartialPerks ? 'inset(0 50% 0 0)' : 'inset(0 0 0 0)' }}
        />
      )}
      {showLockedOverlay && !hasPartialPerks && (
        <div className="absolute inset-0 bg-slate-950/50" />
      )}
      {hasPartialPerks && <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-950/50" />}
    </>
  );
};

export default CharacterOwnershipOverlay;
