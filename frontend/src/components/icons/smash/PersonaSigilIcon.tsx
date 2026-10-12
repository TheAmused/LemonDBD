'use client';
// frontend/src/components/icons/smash/PersonaSigilIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: ROMANCE PERSONA. A compass-rose sigil inside a heart -- "which way
 * does your taste point". Used for the persona button in the hub header.
 */
export const PersonaSigilIcon: React.FC<DbdIconProps> = ({
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
    {/* Heart */}
    <path
      d="M12 21.2C6.4 17.3 3 14 3 10.1 3 7.4 5 5.5 7.5 5.5c1.8 0 3.6 1 4.5 2.7 1-1.7 2.7-2.7 4.5-2.7C19 5.5 21 7.4 21 10.1c0 3.9-3.4 7.2-9 11.1z"
      fill="currentColor"
      fillOpacity={0.12}
    />
    {/* Sigil ring */}
    <circle cx="12" cy="12" r="4.6" strokeWidth={1} strokeDasharray="1 1.7" />
    {/* Compass rose */}
    <path
      d="M12 7.9l1.2 2.9 2.9 1.2-2.9 1.2L12 16.1l-1.2-2.9L7.9 12l2.9-1.2z"
      fill="currentColor"
      fillOpacity={0.5}
      strokeWidth={1.3}
    />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="3.1" r="0.55" fill="currentColor" stroke="none" />
  </svg>
);
