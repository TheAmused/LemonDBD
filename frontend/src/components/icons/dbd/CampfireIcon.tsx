'use client';
// frontend/src/components/icons/dbd/CampfireIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona: The Campfire Soulmate -- The Survivor Campfire.
 * Upgraded & upscaled into the iconic DBD lobby campfire with crossed rough-hewn
 * logs, glowing ember bed, multi-tongued roaring flames with inner heat core,
 * and rising sparks drifting into the fog.
 */
export const CampfireIcon: React.FC<DbdIconProps> = ({
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
    {/* Crossed rough-hewn firewood logs at the base */}
    {/* Log 1: Left to right diagonal */}
    <path
      d="M3.5 21.5l14-6"
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    {/* Log 2: Right to left diagonal */}
    <path
      d="M20.5 21.5l-14-6"
      strokeWidth={2.4}
      strokeLinecap="round"
    />
    {/* Base support log */}
    <path d="M5 21.5h14" strokeWidth={2} strokeLinecap="round" />

    {/* Primary roaring campfire flame silhouette */}
    <path
      d="M12 2C10 5 7 7.5 7 11.5c0 4 3 6.5 5 7.5 2-1 5-3.5 5-7.5 0-4-3-6.5-5-9.5z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.15}
    />

    {/* Dynamic left and right dancing flame tongues */}
    {/* Left licking flame */}
    <path
      d="M9 13.5c-1.5-1-2-2.5-1.5-4 .8 1 1.5 1.5 2.5 1.5"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    {/* Right licking flame */}
    <path
      d="M15 13.5c1.5-1 2-2.5 1.5-4-.8 1-1.5 1.5-2.5 1.5"
      strokeWidth={1.5}
      strokeLinecap="round"
    />

    {/* High-intensity inner flame heat core */}
    <path
      d="M12 7c-1.2 1.8-2 3.2-2 5 0 2.2 1.2 3.8 2 4.5.8-.7 2-2.3 2-4.5 0-1.8-.8-3.2-2-5z"
      fill="currentColor"
      fillOpacity={0.5}
      stroke="currentColor"
      strokeWidth={1.2}
    />
    {/* White-hot center ember */}
    <ellipse cx="12" cy="14" rx="1" ry="1.8" fill="currentColor" stroke="none" />

    {/* Sparks and glowing embers rising into the fog */}
    <circle cx="12" cy="1.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="4.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="5.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);
