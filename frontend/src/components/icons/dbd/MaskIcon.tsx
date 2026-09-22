'use client';
// frontend/src/components/icons/dbd/MaskIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Characters -- The Trapper/Legion Stitched Killer Mask.
 * Upgraded & upscaled with a menacing chiseled jaw, hollow angular eye sockets
 * with sinister glints, heavy leather strap rivets, crude cross-stitch sutures
 * over a deep fracture, and a jagged carved slasher grin.
 */
export const MaskIcon: React.FC<DbdIconProps> = ({
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
    {/* Side leather harness straps and iron rivets */}
    <path d="M4 8.5L1.5 7.5M4 12.5L1.5 13M20 8.5l2.5-1M20 12.5l2.5.5" strokeWidth={1.6} />
    <circle cx="4.8" cy="9" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="19.2" cy="9" r="0.7" fill="currentColor" stroke="none" />

    {/* Primary mask silhouette: brow ridge, chiseled cheekbones, heavy chin */}
    <path
      d="M12 2C6.8 2 3.8 5.5 3.8 10.5c0 3.8 1.8 7 3.7 9.5 1.5 2 3.2 2.5 4.5 2.5s3-.5 4.5-2.5c1.9-2.5 3.7-5.7 3.7-9.5C20.2 5.5 17.2 2 12 2z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.08}
    />

    {/* Heavy brow ridge shadow line */}
    <path d="M7 7.5c1.5-1 3.5-.8 5-.2 1.5-.6 3.5-.8 5 .2" strokeWidth={1.5} strokeOpacity={0.6} />

    {/* Menacing angular sunken eye sockets */}
    <path
      d="M7 9.5l3.5-.5-1 3-3.2-.5z"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.35}
    />
    <path
      d="M17 9.5l-3.5-.5 1 3 3.2-.5z"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.35}
    />
    {/* Predatory inner pupil pinpricks */}
    <circle cx="8.6" cy="10.8" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="15.4" cy="10.8" r="0.6" fill="currentColor" stroke="none" />

    {/* Jagged crack line running across the forehead and cheek */}
    <path d="M12 2.5l-.8 3.5 1.5 2.2-.7 3.8" strokeWidth={1.3} strokeOpacity={0.7} />

    {/* Crude cross-stitch sutures holding the cracked mask together */}
    <path d="M10.2 4.2l2.6 1.2M10.5 5.8l2.2-1" strokeWidth={1.3} />
    <path d="M11.2 7.2l2.5 1M11.5 8.6l2-1.2" strokeWidth={1.3} />

    {/* Vicious carved grin with teeth / slash stitch marks */}
    <path
      d="M7.5 16.5c2 2 7 2 9 0"
      strokeWidth={1.8}
    />
    {/* Vertical slash stitches through the mouth */}
    <path d="M9 15.5v2.2M11 15.8v2.6M13 15.8v2.6M15 15.5v2.2" strokeWidth={1.4} strokeLinecap="round" />
  </svg>
);
