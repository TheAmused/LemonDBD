'use client';
// frontend/src/components/icons/dbd/CampfireMugIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * "Buy Me a Coffee" support link -- a steaming mug with a small campfire
 * ember glowing on it, tying the real-world coffee-support gesture back to
 * DBD's own campfire warmth, in place of the generic Coffee.
 */
export const CampfireMugIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M6 9h9v6a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4z" />
    <path d="M15 11h1.5a2 2 0 0 1 0 4H15" />
    <path d="M9 6c0-1 .8-1.4.8-2.4S9 2 9 2" />
    <path
      d="M12.3 12.3c.5.7.8 1.3.8 1.8a1.1 1.1 0 1 1-2.2 0c0-.5.3-1.1.8-1.8a.2.2 0 0 1 .6 0z"
      fill="currentColor"
      fillOpacity={0.45}
      stroke="none"
    />
  </svg>
);
