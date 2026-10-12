'use client';
// frontend/src/components/icons/smash/HeartCrownIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: HALL OF FAME. A crown set with a heart jewel on a gilded band. Used for the
 * leaderboard button in the hub header.
 */
export const HeartCrownIcon: React.FC<DbdIconProps> = ({
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
    aria-hidden="true"
    {...props}
  >
    {/* Crown */}
    <path d="M3.5 16.6L2.8 7.8l5 4 4.2-7.2 4.2 7.2 5-4-.7 8.8z" fill="currentColor" fillOpacity={0.15} />
    {/* Band */}
    <path d="M3.5 16.6h17v3.3a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" fill="currentColor" fillOpacity={0.32} />
    {/* Heart jewel */}
    <path
      d="M12 15c-1.7-1.1-2.4-1.9-2.4-2.8a1.2 1.2 0 0 1 2.4-.5 1.2 1.2 0 0 1 2.4.5c0 .9-.7 1.7-2.4 2.8z"
      fill="currentColor"
      stroke="none"
    />
    {/* Gleams on the points */}
    <circle cx="2.8" cy="6.4" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="3" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="21.2" cy="6.4" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
