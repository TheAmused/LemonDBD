'use client';
// frontend/src/components/icons/smash/ThunderPulseIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: EFFECTS. A lightning bolt with sound waves rolling off both sides -- effects,
 * sound and music in one glyph. Used for the effects button in the hub header.
 */
export const ThunderPulseIcon: React.FC<DbdIconProps> = ({
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
    {/* Bolt */}
    <path d="M13.2 2.4L6.4 13.2h4.7l-1.1 8.4 7.6-11.2h-4.8z" fill="currentColor" fillOpacity={0.2} />
    {/* Sound waves */}
    <path d="M3.6 9.4a5.4 5.4 0 0 0 0 5.2" strokeWidth={1.5} />
    <path d="M1.4 7.2a8.4 8.4 0 0 0 0 9.6" strokeWidth={1.2} />
    <path d="M20.4 9.4a5.4 5.4 0 0 1 0 5.2" strokeWidth={1.5} />
    <path d="M22.6 7.2a8.4 8.4 0 0 1 0 9.6" strokeWidth={1.2} />
  </svg>
);
