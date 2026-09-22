'use client';
// frontend/src/components/icons/dbd/RealmMapIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Map Explorer -- The Survivor's Realm Map.
 * Upgraded & upscaled into an ancient tri-fold cartographic parchment with
 * terrain contours, compass rose, trial generator beacon, and Entity hook marker.
 */
export const RealmMapIcon: React.FC<DbdIconProps> = ({
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
    {/* Tri-fold parchment map outline with torn weathered edges */}
    <path
      d="M8.8 3.5L2.5 6v14.5l6.3-2.5 6.4 2.5 6.3-2.5V3.5l-6.3 2.5-6.4-2.5z"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.08}
    />

    {/* Primary fold lines dividing the three parchment panels */}
    <path d="M8.8 3.5v14.5" strokeWidth={1.8} />
    <path d="M15.2 6v14.5" strokeWidth={1.8} />

    {/* Left panel: Topographic contour lines and trail path */}
    <path d="M4 10c1.5-.8 2.5.5 3.5-.2M4 14c1.8-.5 2.5.8 3.5.2" strokeWidth={1.2} strokeOpacity={0.6} />
    <circle cx="5.5" cy="8" r="0.6" fill="currentColor" stroke="none" />

    {/* Center panel: The Objective Beacon (Generator / Hatch reveal) */}
    {/* Radiating tracking pulse wave */}
    <circle cx="12" cy="11.5" r="2.6" strokeWidth={1.2} strokeDasharray="1.5 1.5" strokeOpacity={0.7} />
    {/* Central beacon marker */}
    <polygon points="12,9.2 13.5,11.5 12,13.8 10.5,11.5" fill="currentColor" strokeWidth={1} />
    <circle cx="12" cy="11.5" r="0.8" fill="currentColor" stroke="none" />

    {/* Right panel: Compass rose orientation & Hook danger glyph */}
    {/* Mini compass star */}
    <path d="M18.5 7.5v4M16.5 9.5h4" strokeWidth={1.2} strokeOpacity={0.7} />
    <polygon points="18.5,6.5 19.2,8.5 18.5,8 17.8,8.5" fill="currentColor" stroke="none" />

    {/* Danger mark (X marks the sacrificial hook) */}
    <path d="M17.2 15l2.6 2.6M19.8 15l-2.6 2.6" strokeWidth={1.4} strokeOpacity={0.8} />
  </svg>
);
