'use client';
// frontend/src/components/icons/dbd/RankPlacedIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Leaderboard rank: #2/#3 / silver & bronze -- a ribboned medal disc with
 * an inner star, in place of the generic Medal. The silver/bronze color
 * distinction is already carried entirely by the parent element's
 * `medal-silver`/`medal-bronze` CSS class, so one icon covers both ranks
 * exactly as the lucide Medal it replaces did.
 */
export const RankPlacedIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9 3l3 4 3-4" />
    <circle cx="12" cy="14" r="6" />
    <path
      d="M12 11l1.2 2.4 2.6.4-1.9 1.8.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.8 2.6-.4z"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="none"
    />
  </svg>
);
