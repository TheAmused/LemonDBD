// frontend/src/components/icons/dbd/HookBase.tsx
//
// Shared hook silhouette used by the three difficulty-tier icons --
// The Entity's sacrificial meat hook, DBD's single most iconic prop, used
// instead of the borrowed Coins/Flame/Shield/Skull to represent escalating
// challenge-mode difficulty (easy/medium/hell). Each tier adds more flame
// around the same hook rather than switching to an unrelated glyph, so the
// family reads as one escalating scale rather than three disconnected icons.
// Internal helper only -- not part of the public DbdIcons barrel.

import React from 'react';

export const HookBase: React.FC = () => (
  <>
    <path d="M10 3h5" />
    <path d="M13 3v11a4 4 0 0 1-8 0" />
  </>
);
