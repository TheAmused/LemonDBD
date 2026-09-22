'use client';
// frontend/src/components/icons/dbd/SurvivorIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Survivor role icon -- heavy-duty tactical flashlight with high-intensity beam.
 * Upgraded & upscaled with a knurled grip handle, lanyard tailcap, flared
 * reflector head, push-button switch, dust motes, and a powerful blinding light cone.
 */
export const SurvivorIcon: React.FC<DbdIconProps> = ({
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
    {/* Wide radiant blinding light cone */}
    <path
      d="M5 1.5L8.5 7.5h7L19 1.5z"
      fill="currentColor"
      fillOpacity={0.2}
      stroke="none"
    />
    <path
      d="M8 1.5L10 7.5h4L16 1.5z"
      fill="currentColor"
      fillOpacity={0.3}
      stroke="none"
    />

    {/* Piercing focal beam rays breaking through the fog */}
    <path d="M4 1.5l3.5 6" strokeWidth={1.2} strokeOpacity={0.6} />
    <path d="M20 1.5l-3.5 6" strokeWidth={1.2} strokeOpacity={0.6} />
    <path d="M12 1v6.5" strokeWidth={1.5} strokeOpacity={0.8} />

    {/* Light beam suspended dust/fog motes */}
    <circle cx="10" cy="3.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="4" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="11.5" cy="5.8" r="0.6" fill="currentColor" stroke="none" />

    {/* Flared heavy reflector head and glass lens housing */}
    <path
      d="M6.5 7.5h11l-1.5 4h-8z"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.15}
    />
    <path d="M7.8 7.5h8.4" strokeWidth={1.5} />

    {/* Flanged collar between head and body */}
    <rect x="8" y="11.5" width="8" height="1.8" rx="0.5" strokeWidth={1.6} />

    {/* Knurled battery body tube with grip textures */}
    <rect x="8.5" y="13.3" width="7" height="8.2" rx="1.2" strokeWidth={1.8} />
    <path d="M9.5 15.5h5" strokeWidth={1.2} strokeOpacity={0.7} />
    <path d="M9.5 17.5h5" strokeWidth={1.2} strokeOpacity={0.7} />
    <path d="M9.5 19.5h5" strokeWidth={1.2} strokeOpacity={0.7} />

    {/* Side tactical power toggle switch */}
    <path d="M15.5 14.8h1.8v2.4h-1.8" strokeWidth={1.5} />

    {/* Tailcap lanyard attachment ring */}
    <path d="M10.5 21.5v1.2a1 1 0 0 0 2 0v-1.2" strokeWidth={1.4} />
  </svg>
);
