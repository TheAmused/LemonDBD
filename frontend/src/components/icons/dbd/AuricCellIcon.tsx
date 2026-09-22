'use client';
// frontend/src/components/icons/dbd/AuricCellIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Donor / premium tier: Auric Cell.
 * Upgraded & upscaled into a luminous isometric faceted Auric Cell crystal
 * with multi-plane depth, glowing golden core, faceted light refractions,
 * and radiating crystalline sparkle accents.
 */
export const AuricCellIcon: React.FC<DbdIconProps> = ({
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
    {/* Outer isometric hexagonal crystal hull */}
    <polygon
      points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.1}
    />

    {/* Top isometric crystal facet */}
    <polygon
      points="12,2 20.5,7 12,12 3.5,7"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.25}
    />

    {/* Right isometric facet */}
    <polygon
      points="12,12 20.5,7 20.5,17 12,22"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.4}
    />

    {/* Left isometric facet */}
    <polygon
      points="12,12 3.5,7 3.5,17 12,22"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.15}
    />

    {/* Primary 3D axis planes connecting to center */}
    <path d="M12 2v10M12 12l8.5 5M12 12l-8.5 5" strokeWidth={1.8} />

    {/* Inner prismatic core diamond */}
    <polygon
      points="12,6.5 16.5,12 12,17.5 7.5,12"
      strokeWidth={1.3}
      strokeDasharray="2 1.5"
      fill="currentColor"
      fillOpacity={0.3}
    />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />

    {/* Radiating crystalline glints and auric sparkles */}
    <path d="M12 0.5v1M20.5 5.5l1-.5M20.5 18.5l1 .5M12 23.5v-1M3.5 18.5l-1 .5M3.5 5.5l-1-.5" strokeWidth={1.4} />
  </svg>
);
