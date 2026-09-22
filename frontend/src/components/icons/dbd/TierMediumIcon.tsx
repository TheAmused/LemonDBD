'use client';
// frontend/src/components/icons/dbd/TierMediumIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';
import { HookBase } from './HookBase';

/**
 * Difficulty tier: Medium -- the meat hook is entwined in barbed Entity coils,
 * with rising sacrificial flames and hot embers catching along the shank.
 */
export const TierMediumIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 2,
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
    <HookBase />

    {/* Barbed Entity coil wrapping around the hook shank */}
    <path
      d="M10.2 11c2.2.6 3.6 1.8 1.8 3.5-1.5 1.5-1 2.8 1.8 3.5"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <path d="M13.8 11.5l1.5-1.2" strokeWidth={1.3} strokeLinecap="round" />
    <path d="M9.8 14.5l-1.4 1" strokeWidth={1.3} strokeLinecap="round" />

    {/* Sacrificial flame tongues licking the curved bend */}
    <path
      d="M6.5 21c-1.8-1.5-1.2-3.8.4-4.8-.4 1.8.8 2.2 1.4 1.5.2 2-1 2.8-1.8 3.3z"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="currentColor"
      strokeWidth={1.2}
    />

    {/* Ascending flame tongue on the right of the shank */}
    <path
      d="M13.8 17.5c1.4-1.2 1.8-2.6 1-3.8.1 1.2-.5 1.8-1 1.5.3 1.4-.4 2-1 2.3z"
      fill="currentColor"
      fillOpacity={0.35}
      stroke="currentColor"
      strokeWidth={1}
    />

    {/* Glowing embers drifting upward */}
    <circle cx="16.5" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="18" cy="8" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="8" cy="13" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
