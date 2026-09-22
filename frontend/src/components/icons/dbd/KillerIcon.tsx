'use client';
// frontend/src/components/icons/dbd/KillerIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Killer role icon -- a brutal, serrated slasher machete.
 * Upgraded & upscaled with a wrapped cord grip, spiked pommel, notched
 * cutting edge, menacing saw-tooth spine, central blood fuller, and
 * dripping visceral blood droplets.
 */
export const KillerIcon: React.FC<DbdIconProps> = ({
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
    {/* Spiked iron pommel cap */}
    <path d="M10 2h4M12 1v1.5" strokeWidth={2} />

    {/* Wrapped cord hilt with leather binding ridges */}
    <rect x="10.8" y="2.8" width="2.4" height="4.8" rx="0.5" strokeWidth={1.5} />
    <path d="M10.8 4.2h2.4M10.8 5.8h2.4" strokeWidth={1.2} />

    {/* Heavy forged crossguard with downward angled quillons */}
    <path
      d="M6 7.8c1.5.2 4.5.2 6 .2s4.5 0 6-.2c.6 0 .9.5.5 1l-1 1H6.5l-1-1c-.4-.5-.1-1 .5-1z"
      strokeWidth={1.6}
      fill="currentColor"
      fillOpacity={0.15}
    />

    {/* Brutal blade: serrated spine on left, heavy sweeping cutting edge on right */}
    <path
      d="M7.5 9.8v1.8l-1.6.9 1.6.5v1.8l-1.6.9 1.6.5v2.8l4.5 4.5c.3.3.8.3 1.1 0 1.8-2 3.8-5.2 3.8-9.8 0-1.4-.4-2.8-.9-4.1H7.5z"
      strokeWidth={1.8}
    />

    {/* Central blood fuller groove */}
    <path d="M12 10.5v6.5" strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.7} />

    {/* Blade edge battle nicks */}
    <path d="M15.8 13.5l-1.2.6" strokeWidth={1.2} strokeOpacity={0.8} />
    <path d="M14.5 17.2l-1 .5" strokeWidth={1.2} strokeOpacity={0.8} />

    {/* Blood droplets pooling and dripping from the blade */}
    <path
      d="M16.5 15.5c.7.8 1.1 1.5 1.1 2.2a1.1 1.1 0 0 1-2.2 0c0-.7.4-1.4 1.1-2.2z"
      fill="currentColor"
      stroke="none"
    />
    <path
      d="M12 21c-.5.6-.8 1.2-.8 1.7a.8.8 0 1 0 1.6 0c0-.5-.3-1.1-.8-1.7z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);
