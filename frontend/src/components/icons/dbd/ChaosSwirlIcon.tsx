'use client';
// frontend/src/components/icons/dbd/ChaosSwirlIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Challenge-mode identity: Chaos -- The Eldritch Chaos Vortex.
 * Upgraded & upscaled with sweeping spiral vortex tendrils, jagged arcane
 * energy bursts, orbiting chaos particles, and a hypnotic unstable core.
 */
export const ChaosSwirlIcon: React.FC<DbdIconProps> = ({
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
    {...props}
  >
    {/* Swirling Eldritch vortex arms curling inward from outer edges */}
    {/* Top-to-center spiral arm */}
    <path
      d="M12 1.5C6 1.5 2 6 2 11c0 3.5 2 6.5 5 7.5"
      strokeWidth={1.8}
    />
    {/* Bottom-to-center spiral arm */}
    <path
      d="M12 22.5c6 0 10-4.5 10-9.5 0-3.5-2-6.5-5-7.5"
      strokeWidth={1.8}
    />
    {/* Inner accelerated vortex curve */}
    <path
      d="M7 18.5c4 1.5 8.5-.5 8.5-5 0-3-2.5-4.5-5-4.5-3.5 0-4.5 3-2 5.5 1.5 1.5 4.5 1 5-.5"
      strokeWidth={1.6}
      strokeOpacity={0.85}
    />

    {/* Chaotic jagged arcane lightning discharges */}
    <path d="M12 3l1.5 3-2.5 2 3 1.5" strokeWidth={1.4} />
    <path d="M12 21l-1.5-3 2.5-2-3-1.5" strokeWidth={1.4} />
    <path d="M21 12l-3 1.5 2 2.5-3.5-1" strokeWidth={1.4} />
    <path d="M3 12l3-1.5-2-2.5 3.5 1" strokeWidth={1.4} />

    {/* Unstable pulsing center nucleus */}
    <circle cx="12" cy="12" r="2.4" strokeWidth={1.6} fill="currentColor" fillOpacity={0.35} />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />

    {/* Orbiting chaos energy motes */}
    <circle cx="5" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="19" cy="18.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="18" cy="5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="6" cy="19" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
