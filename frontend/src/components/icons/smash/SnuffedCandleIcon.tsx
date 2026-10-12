'use client';
// frontend/src/components/icons/smash/SnuffedCandleIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: PASS. A candle just snuffed out -- cold wax, a curl of smoke, a dead
 * wick. Used for the pass button, the swipe stamp and the pass tally.
 */
export const SnuffedCandleIcon: React.FC<DbdIconProps> = ({
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
    {/* Candle body with a wax-pool lip */}
    <path
      d="M8.6 12.6h6.8v7.9a1 1 0 0 1-1 1H9.6a1 1 0 0 1-1-1z"
      fill="currentColor"
      fillOpacity={0.18}
    />
    <path d="M8.6 12.6c0-1 6.8-1 6.8 0" strokeWidth={1.4} />
    {/* Wax drips */}
    <path d="M10.4 12.9v2.2" strokeWidth={1.3} />
    <path d="M14 12.9v1.4" strokeWidth={1.3} />
    {/* Dead wick */}
    <path d="M12 11.6v1" strokeWidth={1.6} />
    {/* Smoke curling away */}
    <path d="M12 10.2c-1.6-1.1 1.7-2 0-3.3s1.6-1.9.1-3.5" strokeWidth={1.4} />
    <path d="M14.6 7.6c1.2-.5 1.6-1.4 1.2-2.3" strokeWidth={1.1} />
    {/* Candle holder */}
    <path d="M6.6 21.5h10.8" strokeWidth={2} />
    {/* Last embers */}
    <circle cx="9.2" cy="5.8" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="16.6" cy="3.6" r="0.45" fill="currentColor" stroke="none" />
  </svg>
);
