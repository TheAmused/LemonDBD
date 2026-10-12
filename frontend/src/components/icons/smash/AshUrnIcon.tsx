'use client';
// frontend/src/components/icons/smash/AshUrnIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: CLEAR / DELETE. An urn of ashes with a heart on its belly and a thread of smoke --
 * votes burned away. Used for "reset voting data" and for deleting a custom roster.
 */
export const AshUrnIcon: React.FC<DbdIconProps> = ({
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
    {/* Body */}
    <path d="M7 8.2h10l-1 11.2a2 2 0 0 1-2 1.8h-4a2 2 0 0 1-2-1.8z" fill="currentColor" fillOpacity={0.15} />
    {/* Neck */}
    <path d="M7 8.2c0-1.5 2-2.5 5-2.5s5 1 5 2.5" />
    {/* Handles */}
    <path d="M7.2 10c-2.2 0-2.6 3.2 0 3.8" strokeWidth={1.4} />
    <path d="M16.8 10c2.2 0 2.6 3.2 0 3.8" strokeWidth={1.4} />
    {/* Heart on the belly */}
    <path
      d="M12 18c-1.4-.9-1.9-1.5-1.9-2.2a1 1 0 0 1 1.9-.3 1 1 0 0 1 1.9.3c0 .7-.5 1.3-1.9 2.2z"
      fill="currentColor"
      stroke="none"
    />
    {/* Smoke */}
    <path d="M12 5.3c-1-.9.9-1.6.1-2.5-.7-.8.4-1.3.1-2" strokeWidth={1.3} />
  </svg>
);
