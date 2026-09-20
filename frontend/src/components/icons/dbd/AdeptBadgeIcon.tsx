'use client';
// frontend/src/components/icons/dbd/AdeptBadgeIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * "Personal best" achievement badge -- a laurel medal with ribbon tails,
 * echoing DBD's own Adept badges, in place of the generic Trophy cup for
 * the per-mode "Best" stat widgets and every homogeneous personal-best/
 * victory meaning of Trophy across the streak-mode UI.
 */
export const AdeptBadgeIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M9.5 13.5L8 21l4-2 4 2-1.5-7.5" />
    <circle cx="12" cy="9" r="5" />
    <path
      d="M12 6.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"
      fill="currentColor"
      fillOpacity={0.5}
      stroke="none"
    />
  </svg>
);
