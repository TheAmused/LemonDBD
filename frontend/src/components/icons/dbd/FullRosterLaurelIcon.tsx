'use client';
// frontend/src/components/icons/dbd/FullRosterLaurelIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Achievement: "full roster" completion -- a closed, unbroken laurel ring
 * with a glowing center, marking a challenge beaten with every character in
 * the game (TrophySlot's `all` variant), one tier above AdeptBadgeIcon's
 * open laurel-with-ribbons (`owned`, beaten with only unlocked characters).
 * Kept visually distinct from both AdeptBadgeIcon and the admin/leaderboard
 * icons -- this is a completionist mastery concept, not rank or role.
 */
export const FullRosterLaurelIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <circle cx="12" cy="12" r="7" />
    <path d="M12 5c1 1.5 1 2.5 0 4" />
    <path d="M19 12c-1.5 1-2.5 1-4 0" />
    <path d="M12 19c-1-1.5-1-2.5 0-4" />
    <path d="M5 12c1.5-1 2.5-1 4 0" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" fillOpacity={0.5} stroke="none" />
  </svg>
);
