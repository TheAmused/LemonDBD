'use client';
// frontend/src/components/icons/dbd/RankFirstIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Leaderboard rank: #1 / gold -- a bold five-point star, in place of the
 * generic Crown used with `fill-current stroke-current` for the top rank
 * on the Smash-or-Pass leaderboard. Left with no local fill so the existing
 * `fill-current` className keeps working exactly as it did on the lucide
 * Crown it replaces.
 */
export const RankFirstIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 2l2.6 6.1 6.6.5-5 4.4 1.6 6.4L12 16l-5.8 3.4 1.6-6.4-5-4.4 6.6-.5z" />
  </svg>
);
