'use client';
// frontend/src/components/icons/dbd/TierHellIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';
import { HookBase } from './HookBase';

/**
 * Difficulty tier: Hell -- the sacrificial hook is completely engulfed in
 * roaring hellfire, with piercing Entity spider-claws erupting from the blaze
 * and a violent cloud of embers.
 */
export const TierHellIcon: React.FC<DbdIconProps> = ({
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

    {/* Primary raging sacrificial inferno on the hook base */}
    <path
      d="M3 21.5c-1-2.8.2-5.2 2-6.8-.5 2 1.2 2.6 2 1.8.2-2.5 2-3.8 3.2-5.5-.3 2.5 1.5 2.8 2.2 1.8 1 2 0 4.5-2.4 6.2 3.2-.4 4.5-2.2 4-4.8 1.5 1.5 2 3.2 1.2 5.5-2.8 2.2-8.5 2.8-12.2 1.8z"
      fill="currentColor"
      fillOpacity={0.45}
      stroke="currentColor"
      strokeWidth={1.3}
    />

    {/* Intense inner fire core */}
    <path
      d="M5.5 21c-.6-1.5 0-2.8 1-3.6-.2 1 .6 1.4 1 1 .2-1.4 1-2.2 1.7-3-.1 1.4.8 1.5 1.2 1 .6 1.1 0 2.4-1.3 3.3 1.7-.2 2.4-1.2 2.1-2.6.8.8 1 1.7.6 3-1.5 1.2-4.5 1.5-6.3.9z"
      fill="currentColor"
      fillOpacity={0.65}
      stroke="none"
    />

    {/* Entity arachnid talons piercing out through the blaze */}
    <path d="M14.5 15.5l4-1.8 3-4.2" strokeWidth={1.7} strokeLinecap="round" />
    <path d="M13 19l4.5 1 4-1.5" strokeWidth={1.5} strokeLinecap="round" />
    <path d="M3.5 15l-2-2.5 1-3.5" strokeWidth={1.6} strokeLinecap="round" />

    {/* Intense storm of floating embers and sparks */}
    <circle cx="19" cy="6" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="8.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="21" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="8" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="2" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
