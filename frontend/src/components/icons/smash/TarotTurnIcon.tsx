'use client';
// frontend/src/components/icons/smash/TarotTurnIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: FLIP. A tarot card with a heart pip, turned over by two arrows that
 * chase each other around it. Used for the flip-to-back / flip-to-front button.
 */
export const TarotTurnIcon: React.FC<DbdIconProps> = ({
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
    {/* Turn arrows */}
    <path d="M21 12a9 9 0 0 0-14.8-6.9" strokeWidth={1.6} />
    <path d="M9.2 5.2H5.8V1.9" strokeWidth={1.6} />
    <path d="M3 12a9 9 0 0 0 14.8 6.9" strokeWidth={1.6} />
    <path d="M14.8 18.8h3.4v3.3" strokeWidth={1.6} />
    {/* The card */}
    <rect x="7.2" y="6.4" width="9.6" height="11.2" rx="1.6" fill="currentColor" fillOpacity={0.14} />
    <rect x="8.6" y="7.8" width="6.8" height="8.4" rx="0.8" strokeWidth={0.9} />
    {/* Heart pip */}
    <path
      d="M12 14.4c-1.7-1.1-2.4-1.9-2.4-2.8a1.2 1.2 0 0 1 2.4-.5 1.2 1.2 0 0 1 2.4.5c0 .9-.7 1.7-2.4 2.8z"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="10" cy="9.2" r="0.4" fill="currentColor" stroke="none" />
    <circle cx="14" cy="14.8" r="0.4" fill="currentColor" stroke="none" />
  </svg>
);
