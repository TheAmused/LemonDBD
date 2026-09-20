'use client';
// frontend/src/components/icons/dbd/SurvivorIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Survivor role icon -- a flashlight casting a beam. Lens housing +
 * battery body + a soft filled beam-glow triangle above it. Survivors'
 * signature item for blinding killers, rather than a generic "protection"
 * shield.
 */
export const SurvivorIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    {/* beam glow */}
    <path d="M8.5 6L12 1l3.5 5z" fill="currentColor" fillOpacity={0.25} stroke="none" />
    {/* lens housing */}
    <rect x="8" y="6" width="8" height="4" rx="1" />
    {/* battery body */}
    <rect x="9" y="10" width="6" height="11" rx="1.5" />
    {/* switch button */}
    <path d="M15 13.5h1.5" />
  </svg>
);
