'use client';
// frontend/src/components/icons/dbd/CampfireIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona archetype: The Campfire Soulmate -- a literal campfire,
 * DBD's lobby gathering point and clearest symbol of warmth and found
 * family, in place of the generic protection Shield.
 */
export const CampfireIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M7 21l4-3M17 21l-4-3M8 21h8" />
    <path d="M12 4c1.5 2 2.5 3.6 2.5 5.6a2.5 2.5 0 0 1-5 0C9.5 7.6 10.5 6 12 4z" />
    <path
      d="M12 8c.6 1 1 1.8 1 2.6a1 1 0 0 1-2 0c0-.8.4-1.6 1-2.6z"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="none"
    />
  </svg>
);
