'use client';
// frontend/src/components/icons/dbd/RankPlacedIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Leaderboard rank: #2/#3 (Silver & Bronze) -- Forged Trial Medal Medallion.
 * Upgraded & upscaled with a chevron neckband ribbon, heavy riveted outer bezel,
 * inner concentric coin ring, and an embossed trial star emblem with draped ribbons.
 */
export const RankPlacedIcon: React.FC<DbdIconProps> = ({
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
    {/* Upper chevron neckband ribbon with striped fold texture */}
    <path
      d="M7 2l5 6 5-6"
      strokeWidth={1.8}
    />
    <path d="M9.5 2l2.5 3 2.5-3" strokeWidth={1.2} strokeOpacity={0.6} />
    <path d="M4.5 2h5M14.5 2h5" strokeWidth={1.5} />

    {/* Ribbon suspension clasp */}
    <rect x="10" y="6.8" width="4" height="1.6" rx="0.5" strokeWidth={1.4} fill="currentColor" fillOpacity={0.3} />

    {/* Primary heavy forged medallion coin */}
    <circle
      cx="12"
      cy="14.5"
      r="7"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.1}
    />

    {/* Rivets along the medallion rim */}
    <circle cx="12" cy="9.2" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="17.3" cy="14.5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19.8" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="6.7" cy="14.5" r="0.5" fill="currentColor" stroke="none" />

    {/* Inner beveled ring */}
    <circle cx="12" cy="14.5" r="5.2" strokeWidth={1.2} strokeDasharray="2 1.5" strokeOpacity={0.7} />

    {/* Embossed Trial Star emblem */}
    <polygon
      points="12,10.8 13.3,13.5 16,13.8 14,15.7 14.5,18.5 12,17.2 9.5,18.5 10,15.7 8,13.8 10.7,13.5"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="currentColor"
      strokeWidth={1.1}
    />
    <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />

    {/* Bottom ribbon ends draped below the medallion */}
    <path d="M8 19.5l-1.5 3 2-.8" strokeWidth={1.4} />
    <path d="M16 19.5l1.5 3-2-.8" strokeWidth={1.4} />
  </svg>
);
