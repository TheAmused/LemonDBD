'use client';
// frontend/src/components/icons/smash/HeartSieveIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: FILTER. A funnel with sieve bars and a heart dropping out of the spout --
 * only the candidates you want fall through. Used for the filter button in the hub header.
 */
export const HeartSieveIcon: React.FC<DbdIconProps> = ({
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
    {/* Funnel */}
    <path d="M3.5 4.2h17l-6.4 7.4v4.9l-4.2 2.3v-7.2z" fill="currentColor" fillOpacity={0.14} />
    {/* Sieve bars */}
    <path d="M6.4 7.1h11.2" strokeWidth={1.1} />
    <path d="M9.3 9.9h5.4" strokeWidth={1.1} />
    {/* The heart that makes it through */}
    <path
      d="M12 23c-1.4-.9-2-1.6-2-2.4a1 1 0 0 1 2-.3 1 1 0 0 1 2 .3c0 .8-.6 1.5-2 2.4z"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="17.6" cy="19.6" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="6.8" cy="20.6" r="0.45" fill="currentColor" stroke="none" />
  </svg>
);
