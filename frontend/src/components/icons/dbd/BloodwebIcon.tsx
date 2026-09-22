'use client';
// frontend/src/components/icons/dbd/BloodwebIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Randomizer -- The Entity's Bloodweb.
 * Upgraded & upscaled into an authentic eldritch web network with organic curved
 * strands, concentric node tiers, faceted bloodweb node sockets, and a pulsing
 * central Entity nexus.
 */
export const BloodwebIcon: React.FC<DbdIconProps> = ({
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
    {/* Concentric curved spiderweb spans connecting radial branches */}
    {/* Outer web ring */}
    <path
      d="M12 2.5Q17 5 19.8 7.5Q20 12 19.8 16.5Q16 19 12 21.5Q8 19 4.2 16.5Q4 12 4.2 7.5Q7 5 12 2.5z"
      strokeWidth={1.2}
      strokeOpacity={0.45}
    />

    {/* Inner web ring */}
    <path
      d="M12 6.5Q15.5 8 17 9.8Q17 12 17 14.2Q14.5 16 12 17.5Q9.5 16 7 14.2Q7 12 7 9.8Q8.5 8 12 6.5z"
      strokeWidth={1.3}
      strokeOpacity={0.7}
      fill="currentColor"
      fillOpacity={0.06}
    />

    {/* Primary radiating web tendril strands from center to outer nodes */}
    <path d="M12 12V2.5" strokeWidth={1.8} />
    <path d="M12 12l7.8-4.5" strokeWidth={1.8} />
    <path d="M12 12l7.8 4.5" strokeWidth={1.8} />
    <path d="M12 12v9.5" strokeWidth={1.8} />
    <path d="M12 12l-7.8 4.5" strokeWidth={1.8} />
    <path d="M12 12l-7.8-4.5" strokeWidth={1.8} />

    {/* Inner ring minor perk sockets */}
    <circle cx="12" cy="6.5" r="1.2" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1} />
    <circle cx="17" cy="9.8" r="1.2" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1} />
    <circle cx="17" cy="14.2" r="1.2" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1} />
    <circle cx="12" cy="17.5" r="1.2" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1} />
    <circle cx="7" cy="14.2" r="1.2" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1} />
    <circle cx="7" cy="9.8" r="1.2" fill="currentColor" fillOpacity={0.5} stroke="currentColor" strokeWidth={1} />

    {/* Outer ring major mystery & offering nodes */}
    <polygon points="12,1.2 13.3,2.5 12,3.8 10.7,2.5" fill="currentColor" stroke="none" />
    <polygon points="19.8,6.2 21.1,7.5 19.8,8.8 18.5,7.5" fill="currentColor" stroke="none" />
    <polygon points="19.8,15.2 21.1,16.5 19.8,17.8 18.5,16.5" fill="currentColor" stroke="none" />
    <polygon points="12,20.2 13.3,21.5 12,22.8 10.7,21.5" fill="currentColor" stroke="none" />
    <polygon points="4.2,15.2 5.5,16.5 4.2,17.8 2.9,16.5" fill="currentColor" stroke="none" />
    <polygon points="4.2,6.2 5.5,7.5 4.2,8.8 2.9,7.5" fill="currentColor" stroke="none" />

    {/* Central Entity Nexus Eye / Level Node */}
    <circle cx="12" cy="12" r="2.8" strokeWidth={1.8} fill="currentColor" fillOpacity={0.3} />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
