'use client';
// frontend/src/components/icons/smash/CardStackIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: CARDS LEFT. Three tarot cards fanned out, a heart pip on the top one.
 * Used for the "cards left in the deck" tally in the hub header.
 */
export const CardStackIcon: React.FC<DbdIconProps> = ({
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
    {/* Cards behind, fanned */}
    <rect x="8.2" y="4.6" width="7.6" height="13.4" rx="1.6" transform="rotate(-24 12 21)" strokeWidth={1.4} fill="currentColor" fillOpacity={0.08} />
    <rect x="8.2" y="4.6" width="7.6" height="13.4" rx="1.6" transform="rotate(24 12 21)" strokeWidth={1.4} fill="currentColor" fillOpacity={0.08} />
    {/* Top card */}
    <rect x="7.8" y="4.4" width="8.4" height="14.8" rx="1.6" fill="currentColor" fillOpacity={0.25} />
    <path
      d="M12 14.2c-1.5-1-2.1-1.7-2.1-2.5a1.1 1.1 0 0 1 2.1-.4 1.1 1.1 0 0 1 2.1.4c0 .8-.6 1.5-2.1 2.5z"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="9.9" cy="6.5" r="0.4" fill="currentColor" stroke="none" />
    <circle cx="14.1" cy="16.5" r="0.4" fill="currentColor" stroke="none" />
  </svg>
);
