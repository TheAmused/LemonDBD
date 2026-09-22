'use client';
// frontend/src/components/icons/dbd/FullRosterLaurelIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Achievement: Full Roster Completionist Laurel Crown.
 * Upgraded & upscaled into a grand circular victory laurel crown woven with
 * Entity thorns, alternating laurel foliage, bottom ribbon tie, and an
 * inner 8-point grandmaster starburst.
 */
export const FullRosterLaurelIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 1.6,
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
    {/* Left laurel branch stem */}
    <path
      d="M12 21.5c-5.2 0-9.5-4.3-9.5-9.5 0-4 2.5-7.5 6.5-9"
      strokeWidth={1.8}
    />
    {/* Right laurel branch stem */}
    <path
      d="M12 21.5c5.2 0 9.5-4.3 9.5-9.5 0-4-2.5-7.5-6.5-9"
      strokeWidth={1.8}
    />

    {/* Left branch laurel leaves and Entity thorns */}
    <path d="M2.5 12c-1-1.5 0-3 1.5-2.5M3.5 8c-1.2-1.5-.2-2.8 1.5-2M6 4.8c-.8-1.5.5-2.5 2-1.5" strokeWidth={1.4} />
    <path d="M3.5 16c-1.5 1-.8 2.5.8 2.2M6.5 19.5c-1 1.2 0 2.2 1.5 1.5" strokeWidth={1.4} />
    {/* Barbed Entity thorns piercing through left stem */}
    <path d="M3.8 10.5l-1.8.5M4.8 14.5l-1.5 1" strokeWidth={1.3} />

    {/* Right branch laurel leaves and Entity thorns */}
    <path d="M21.5 12c1-1.5 0-3-1.5-2.5M20.5 8c1.2-1.5.2-2.8-1.5-2M18 4.8c.8-1.5-.5-2.5-2-1.5" strokeWidth={1.4} />
    <path d="M20.5 16c1.5 1 .8 2.5-.8 2.2M17.5 19.5c1 1.2 0 2.2-1.5 1.5" strokeWidth={1.4} />
    {/* Barbed thorns right stem */}
    <path d="M20.2 10.5l1.8.5M19.2 14.5l1.5 1" strokeWidth={1.3} />

    {/* Ribbon tie knot at bottom */}
    <circle cx="12" cy="21.5" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10.8 22.5l-1.5 1.5M13.2 22.5l1.5 1.5" strokeWidth={1.4} />

    {/* Center Grandmaster Starburst & Aura */}
    <polygon
      points="12,5.5 13.8,9.5 18,9.5 14.5,12 16,16 12,13.5 8,16 9.5,12 6,9.5 10.2,9.5"
      fill="currentColor"
      fillOpacity={0.35}
      stroke="currentColor"
      strokeWidth={1.3}
    />
    <circle cx="12" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
    {/* Cardinal energy rays */}
    <path d="M12 4v1.5M12 17.5v1.5M4.5 11.5h1.5M18 11.5h1.5" strokeWidth={1.4} strokeOpacity={0.7} />
  </svg>
);
