'use client';
// frontend/src/components/icons/smash/PadlockHeartIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: LOCKED. A padlock with a heart-shaped keyhole. Used for rosters that are not
 * open yet.
 */
export const PadlockHeartIcon: React.FC<DbdIconProps> = ({
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
    {/* Shackle */}
    <path d="M8 10.6V7.4a4 4 0 0 1 8 0v3.2" />
    {/* Body */}
    <path d="M5.5 10.6h13v8.9a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5z" fill="currentColor" fillOpacity={0.15} />
    {/* Heart keyhole */}
    <path
      d="M12 18.4c-1.5-1-2.1-1.7-2.1-2.5a1.1 1.1 0 0 1 2.1-.4 1.1 1.1 0 0 1 2.1.4c0 .8-.6 1.5-2.1 2.5z"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="7.6" cy="12.6" r="0.4" fill="currentColor" stroke="none" />
    <circle cx="16.4" cy="12.6" r="0.4" fill="currentColor" stroke="none" />
  </svg>
);
