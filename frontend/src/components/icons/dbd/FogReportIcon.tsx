'use client';
// frontend/src/components/icons/dbd/FogReportIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Report a bug / issue: The Fog Communiqué.
 * Upgraded & upscaled from a generic chat bubble into an eerie fog-warped
 * communiqué parchment pierced by Entity barbs, with torn edges, a dagger-shaped
 * alert exclamation, and deep fracture lines.
 */
export const FogReportIcon: React.FC<DbdIconProps> = ({
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
    {/* Barbed Entity claws piercing the top and left of the message */}
    <path d="M5 2.5l2 3-1.5 2M1.5 8l3 1-1 3" strokeWidth={1.6} strokeLinecap="round" />
    <path d="M19 2.5l-2 3 1.5 2M22.5 8l-3 1 1 3" strokeWidth={1.6} strokeLinecap="round" />

    {/* Primary torn, fog-warped parchment communiqué hull */}
    <path
      d="M12 3.5C6.5 3.5 2.5 7.5 2.5 12c0 2.5 1.5 4.8 3.5 6.2L4.5 22l5.5-2.2c1 .4 2 .6 3 .6 5.5 0 10.5-4 10.5-8.4 0-4.5-5-8.5-11.5-8.5z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.08}
    />

    {/* Weathered parchment edge crease */}
    <path d="M4.5 22l2.5-3.5" strokeWidth={1.6} />

    {/* Deep fracture crack across message face */}
    <path d="M15 5.5l-2.5 3.5 3 2.5-2 3" strokeWidth={1.3} strokeOpacity={0.6} />

    {/* Vicious Dagger-shaped Alert Exclamation Point */}
    {/* Exclamation blade */}
    <path
      d="M12 7l1.2 5.5h-2.4z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.2}
    />
    <path d="M12 7v5.5" strokeWidth={1.5} />

    {/* Exclamation drop / puncture dot */}
    <ellipse cx="12" cy="15.8" rx="1.2" ry="1.4" fill="currentColor" stroke="none" />

    {/* Floating distress motes */}
    <circle cx="8" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="14" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
