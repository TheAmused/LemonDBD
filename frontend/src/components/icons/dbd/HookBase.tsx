// frontend/src/components/icons/dbd/HookBase.tsx
//
// The Entity's Sacrificial Meat Hook -- DBD's signature set piece.
// Upgraded & upscaled with an industrial mounting bracket, heavy forged
// chain link, thick curved steel hook with vicious barb, surface gouges,
// and dripping blood from the piercing tip.

import React from 'react';

export const HookBase: React.FC = () => (
  <>
    {/* Overhead heavy iron beam bracket & rivet bolts */}
    <path d="M4 2h16" strokeWidth={2.2} />
    <circle cx="6.5" cy="2" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="2" r="0.6" fill="currentColor" stroke="none" />

    {/* Forged iron shackle & chain links */}
    <path d="M10 2v2.5h4V2" strokeWidth={1.8} />
    <rect x="10.5" y="4" width="3" height="3.5" rx="1.5" strokeWidth={1.5} />

    {/* Hook collar / swivel ring */}
    <path d="M9 7.5h6" strokeWidth={2} />

    {/* Thick sacrificial meat hook shank, deep heavy curve, and lethal barbed tip */}
    <path
      d="M12 7.5v6.5c0 4.2-3.3 7.5-7.5 7.5A6.5 6.5 0 0 1 2.2 16c.3-1.6 1.1-3.2 2-4.5"
      strokeWidth={2.2}
      strokeLinecap="round"
    />

    {/* Hook vicious inner barb and sharp point */}
    <path d="M4.2 11.5l1.6 4.2" strokeWidth={2} strokeLinecap="round" />

    {/* Surface nick / battle gouge on the steel shank */}
    <path d="M11 11.5l2 1.5" strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.6} />

    {/* Blood drip dripping from the barbed tip */}
    <path
      d="M4.2 17.5c-.7.9-1.2 1.7-1.2 2.4a1.2 1.2 0 0 0 2.4 0c0-.7-.5-1.5-1.2-2.4z"
      fill="currentColor"
      stroke="none"
    />
  </>
);
