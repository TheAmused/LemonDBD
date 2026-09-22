'use client';
// frontend/src/components/icons/dbd/PerkHexIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Perks -- the iconic Dead by Daylight Tier 3 Perk Diamond.
 * Upgraded & upscaled with spiked Entity corner crests, double-beveled frame,
 * inner occult hex rune, glowing center gem, and arcane power conduits.
 */
export const PerkHexIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 1.8,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Tier 3 spiked Entity corner crests (DBD's purple perk embellishments) */}
    <path d="M12 1l1.5 2.5h-3z" fill="currentColor" strokeWidth={1} />
    <path d="M12 23l1.5-2.5h-3z" fill="currentColor" strokeWidth={1} />
    <path d="M1 12l2.5 1.5v-3z" fill="currentColor" strokeWidth={1} />
    <path d="M23 12l-2.5 1.5v-3z" fill="currentColor" strokeWidth={1} />

    {/* Primary heavy outer Perk Diamond frame */}
    <path
      d="M12 2.5L21.5 12 12 21.5 2.5 12z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.08}
    />

    {/* Inner beveled diamond border */}
    <path
      d="M12 5.5L18.5 12 12 18.5 5.5 12z"
      strokeWidth={1.3}
      strokeOpacity={0.8}
    />

    {/* Inner Occult Hex Sigil / Arcane Rune */}
    <path
      d="M12 7.5v9M7.5 12h9"
      strokeWidth={1.2}
      strokeOpacity={0.6}
    />
    <circle cx="12" cy="12" r="3.2" strokeWidth={1.4} strokeDasharray="2 1.5" />

    {/* Central pulsing power core gem */}
    <polygon
      points="12,9.2 14.8,12 12,14.8 9.2,12"
      fill="currentColor"
      fillOpacity={0.5}
      stroke="currentColor"
      strokeWidth={1.2}
    />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />

    {/* Arcane corner scratch accents */}
    <path d="M6 7l1.5 1.5M18 7l-1.5 1.5M6 17l1.5-1.5M18 17l-1.5-1.5" strokeWidth={1.2} strokeOpacity={0.7} />
  </svg>
);
