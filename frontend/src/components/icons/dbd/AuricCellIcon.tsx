'use client';
// frontend/src/components/icons/dbd/AuricCellIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Donor / premium-supporter tier -- a faceted cell/gem, evoking DBD's own
 * Auric Cells (its real-money currency), in place of the generic Crown used
 * for the "Patreon Community" support-gateway option. Kept distinct from
 * OverseerEyeIcon (admin/staff) and IridescentShardIcon (leaderboard) --
 * this is specifically about investing real support in the project.
 */
export const AuricCellIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 3c3 0 5.5 2.2 5.5 5.2 0 4.2-3 7.8-5.5 11.3-2.5-3.5-5.5-7.1-5.5-11.3C6.5 5.2 9 3 12 3z" />
    <path d="M8 8.5h8" />
    <path d="M12 3v5.5" />
    <path
      d="M10 8.5l2 3.5 2-3.5z"
      fill="currentColor"
      fillOpacity={0.35}
      stroke="none"
    />
  </svg>
);
