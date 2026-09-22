'use client';
// frontend/src/components/icons/dbd/FogDriftIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona: The Fog Romantic -- The Supernatural Fog.
 * Upgraded & upscaled into undulating volumetric fog banks with swirling
 * mist eddies, layered atmospheric ribbons, celestial fog sparkles, and floating motes.
 */
export const FogDriftIcon: React.FC<DbdIconProps> = ({
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
    {/* Upper undulating fog bank with curling eddy */}
    <path
      d="M2 8.5c3-2 6.5-1 9 1s5.5 1.5 8-.5c2.5-2 3-1 3.5 0"
      strokeWidth={2}
    />
    <path
      d="M19 5.5c-1.5 0-2.5 1-2 2s1.5 1 2.5.5"
      strokeWidth={1.4}
      strokeOpacity={0.7}
    />

    {/* Middle heavy rolling fog ribbon with curling spiral */}
    <path
      d="M1.5 13.5c3.5 1.5 7 .5 9.5-1s5-1 8 .5 3 2 3.5 2"
      strokeWidth={2}
    />
    {/* Left fog spiral eddy */}
    <path
      d="M4.5 16.5c-1.5 0-2.5-1-2-2.5s2-1.5 3-.5"
      strokeWidth={1.4}
      strokeOpacity={0.7}
    />

    {/* Ground-level dense trial fog bank */}
    <path
      d="M2 19c3.5-1.5 7-1.5 10.5 0s6.5 1 10-.5"
      strokeWidth={2.2}
    />
    <path
      d="M5 21.5c4-1 9-1 14 0"
      strokeWidth={1.5}
      strokeOpacity={0.6}
    />

    {/* Celestial moonlight / entity sparkle catching in the mist */}
    <path
      d="M17.5 2.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"
      fill="currentColor"
      fillOpacity={0.5}
      stroke="currentColor"
      strokeWidth={1}
    />
    {/* Secondary mist glint */}
    <path
      d="M7 3.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"
      fill="currentColor"
      stroke="none"
    />

    {/* Suspended fog motes drifting through the darkness */}
    <circle cx="12" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="14" cy="11" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="7" cy="11.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
