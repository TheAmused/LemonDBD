'use client';
// frontend/src/components/icons/dbd/IridescentShardIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Smash-or-Pass leaderboard / Hall of Fame -- a faceted Iridescent shard,
 * DBD's own rarest add-on tier, in place of the generic Trophy. Kept
 * distinct from AdeptBadgeIcon on purpose: this is a ranking/leaderboard
 * concept, not a personal achievement.
 */
export const IridescentShardIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 2l5.5 5-5.5 15-5.5-15z" />
    <path d="M6.5 7h11" />
    <path d="M9.8 7L12 22M14.2 7L12 22" />
    <path
      d="M12 2l2 3.2-2 1.8-2-1.8z"
      fill="currentColor"
      fillOpacity={0.45}
      stroke="none"
    />
  </svg>
);
