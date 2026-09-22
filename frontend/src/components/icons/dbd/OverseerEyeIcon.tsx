'use client';
// frontend/src/components/icons/dbd/OverseerEyeIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Admin / staff badge: The Entity Overseer's All-Seeing Eye.
 * Upgraded & upscaled into an imposing spiked diamond reliquary enclosing
 * a detailed occult eye with upper/lower eyelid folds, striated iris, predatory
 * vertical slit pupil, and radiating omniscience rays.
 */
export const OverseerEyeIcon: React.FC<DbdIconProps> = ({
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
    {/* Spiked Reliquary Compass Points (The Entity's Cardinal Watch) */}
    <path d="M12 1l1.8 3.5h-3.6z" fill="currentColor" strokeWidth={1} />
    <path d="M12 23l1.8-3.5h-3.6z" fill="currentColor" strokeWidth={1} />
    <path d="M1 12l3.5 1.8v-3.6z" fill="currentColor" strokeWidth={1} />
    <path d="M23 12l-3.5 1.8v-3.6z" fill="currentColor" strokeWidth={1} />

    {/* Primary heavy outer Diamond Frame */}
    <path
      d="M12 3L21.5 12 12 21 2.5 12z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.08}
    />

    {/* Inner beveled diamond border */}
    <path
      d="M12 5.5L18.5 12 12 18.5 5.5 12z"
      strokeWidth={1.3}
      strokeOpacity={0.7}
    />

    {/* Upper and lower eye socket folds */}
    <path
      d="M6 12c1.8-4 4-5.5 6-5.5s4.2 1.5 6 5.5c-1.8 4-4 5.5-6 5.5s-4.2-1.5-6-5.5z"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.18}
    />

    {/* Iris ring with striated texture */}
    <circle
      cx="12"
      cy="12"
      r="4"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.25}
    />
    <path d="M12 8.2v1.2M12 14.6v1.2M8.2 12h1.2M14.6 12h1.2" strokeWidth={1.2} strokeOpacity={0.7} />

    {/* Predatory Vertical Slit Pupil */}
    <path
      d="M12 9.5c.8 1.2 1.2 1.8 1.2 2.5s-.4 1.3-1.2 2.5c-.8-1.2-1.2-1.8-1.2-2.5s.4-1.3 1.2-2.5z"
      fill="currentColor"
      stroke="none"
    />

    {/* Eyelid crease details */}
    <path d="M8 8.5c1.2-.8 2.5-1 4-1s2.8.2 4 1" strokeWidth={1.2} strokeOpacity={0.5} />
    <path d="M8 15.5c1.2.8 2.5 1 4 1s2.8-.2 4-1" strokeWidth={1.2} strokeOpacity={0.5} />
  </svg>
);
