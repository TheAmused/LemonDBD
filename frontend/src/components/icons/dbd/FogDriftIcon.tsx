'use client';
// frontend/src/components/icons/dbd/FogDriftIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona archetype: The Fog Romantic -- drifting fog bands with a
 * single sparkle catching in them, in place of the generic Sparkles (also
 * this modal's fallback/default persona icon).
 */
export const FogDriftIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M3 9c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
    <path d="M3 14c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
    <path d="M3 19c2-1.4 4-1.4 6 0s4 1.4 6 0 4-1.4 6 0" />
    <path
      d="M17.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"
      fill="currentColor"
      fillOpacity={0.45}
      stroke="none"
    />
  </svg>
);
