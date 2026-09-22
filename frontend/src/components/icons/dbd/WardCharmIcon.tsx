'use client';
// frontend/src/components/icons/dbd/WardCharmIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Offering category: Wards -- The Black/White Ward Protective Stone Amulet.
 * Upgraded & upscaled with a braided cord loop, inscribed rune disk,
 * protective occult all-seeing eye, warding runes, and ritual fringe cords.
 */
export const WardCharmIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 1.7,
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
    {/* Braided suspension cord loop */}
    <circle cx="12" cy="2.5" r="1.5" strokeWidth={1.5} />
    <path d="M12 4v2" strokeWidth={1.8} />

    {/* Primary heavy carved stone talisman disc */}
    <circle
      cx="12"
      cy="13"
      r="7.5"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.08}
    />

    {/* Inner inscribed concentric warding circle */}
    <circle cx="12" cy="13" r="5.5" strokeWidth={1.2} strokeDasharray="2 1.5" strokeOpacity={0.7} />

    {/* Central Inscribed Eye of Protection (The Ward Sigil) */}
    <path
      d="M8.5 13c1.2-2 2.3-2.5 3.5-2.5s2.3.5 3.5 2.5c-1.2 2-2.3 2.5-3.5 2.5s-2.3-.5-3.5-2.5z"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.25}
    />
    {/* Slit warding pupil */}
    <ellipse cx="12" cy="13" rx="0.9" ry="1.4" fill="currentColor" stroke="none" />

    {/* Runic warding marks carved at cardinal edges */}
    <path d="M12 6.5v1.2M12 18.3v1.2M5.5 13h1.2M17.3 13h1.2" strokeWidth={1.4} />
    <path d="M7.8 8.8l.9.9M15.3 16.3l.9.9M7.8 17.2l.9-.9M15.3 9.7l.9-.9" strokeWidth={1.2} strokeOpacity={0.6} />

    {/* Protective fringe cords hanging from bottom */}
    <path d="M9.5 20.2l-1 2.8M14.5 20.2l1 2.8M12 20.5v3" strokeWidth={1.4} />
  </svg>
);
