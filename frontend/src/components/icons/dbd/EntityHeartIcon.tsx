'use client';
// frontend/src/components/icons/dbd/EntityHeartIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona archetype: The Entity's Paramour -- a heart embraced by
 * two curling Entity tendrils, in place of the generic Heart, making the
 * "devoted to the Entity itself" framing explicit.
 */
export const EntityHeartIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path
      d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.6 12 20 12 20z"
      fill="currentColor"
      fillOpacity={0.25}
    />
    <path d="M4 9c1 1 1.4 2.1 1.1 3.3" />
    <path d="M20 9c-1 1-1.4 2.1-1.1 3.3" />
  </svg>
);
