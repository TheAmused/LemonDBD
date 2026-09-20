'use client';
// frontend/src/components/icons/dbd/EntityMarkIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona archetype: The Eldritch Devotee -- a branded sigil of the
 * Entity's spindly tendril-legs, in place of the generic danger Skull.
 */
export const EntityMarkIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 2v6" />
    <path d="M12 8l-4 3M12 8l4 3" />
    <path d="M12 8v10" />
    <path d="M12 13l-5 2M12 13l5 2" />
    <path d="M12 18l-3 3M12 18l3 3" />
  </svg>
);
