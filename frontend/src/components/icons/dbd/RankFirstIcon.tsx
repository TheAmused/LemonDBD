'use client';
// frontend/src/components/icons/dbd/RankFirstIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Leaderboard rank: #1 (Gold / Iridescent) -- The Bladed Victory Star Crest.
 * Upgraded & upscaled with razor-sharp points, flanking Entity winglets,
 * and an evenodd inner Rank 'I' cutout that renders crisp whether rendered
 * as stroke-only or with the caller's `fill-current` class.
 */
export const RankFirstIcon: React.FC<DbdIconProps> = ({
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
    {/* Outer Grandmaster Bladed Star with Entity claw winglets */}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 1.5l3.2 6.5 7.3 1-5.3 5.2 1.3 7.3L12 18l-6.5 3.5 1.3-7.3L1.5 9l7.3-1L12 1.5zm0 6.5l-1.5 3h3L12 8zm-1.5 4h3v4.5h-3V12z"
    />

    {/* Entity claw spikes on the lateral tips */}
    <path d="M18.5 4.5l-1.5 2.5M5.5 4.5l1.5 2.5" strokeWidth={1.4} strokeLinecap="round" />
    <path d="M21 16.5l-2.5-1M3 16.5l2.5-1" strokeWidth={1.4} strokeLinecap="round" />

    {/* Base trial pedestal accent line */}
    <path d="M9.5 21.5h5" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);
