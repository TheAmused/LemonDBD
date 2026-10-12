'use client';
// frontend/src/components/icons/smash/ThornHeartIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: SMASH. A heart wrapped in barbed thorns with a hairline crack running
 * through it -- desire with a bite. Used for the smash button, the swipe stamp and the
 * smash tally.
 */
export const ThornHeartIcon: React.FC<DbdIconProps> = ({
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
    {/* The heart */}
    <path
      d="M12 20.6C6.2 16.7 3 13.3 3 9.4 3 6.7 5 4.8 7.5 4.8c1.7 0 3.4.9 4.5 2.5 1.1-1.6 2.8-2.5 4.5-2.5C19 4.8 21 6.7 21 9.4c0 3.9-3.2 7.3-9 11.2z"
      fill="currentColor"
      fillOpacity={0.18}
    />
    {/* Hairline crack */}
    <path d="M12 7.3l-1.5 3 2.1 1.6-1.9 3.4" strokeWidth={1.2} />
    {/* Thorns, three a side, pointing away from the outline */}
    <path d="M3.9 6.3L1.9 5" strokeWidth={1.5} />
    <path d="M20.1 6.3l2-1.3" strokeWidth={1.5} />
    <path d="M3.2 11.6l-2.2.9" strokeWidth={1.5} />
    <path d="M20.8 11.6l2.2.9" strokeWidth={1.5} />
    <path d="M6.6 16.6l-1.4 1.9" strokeWidth={1.5} />
    <path d="M17.4 16.6l1.4 1.9" strokeWidth={1.5} />
    {/* A bead of blood at the tip */}
    <circle cx="12" cy="22.6" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
