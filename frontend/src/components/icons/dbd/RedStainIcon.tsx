'use client';
// frontend/src/components/icons/dbd/RedStainIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona archetype: The Red Stain Addict -- a lit torch/beacon,
 * evoking the killer's telltale red-stain glow this persona is obsessed
 * with chasing, in place of the generic Flame.
 */
export const RedStainIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M9 21h6" />
    <path d="M12 21v-10" />
    <path
      d="M9 11c0-3 1-4.2 3-7.5 2 3.3 3 4.5 3 7.5a3 3 0 0 1-6 0z"
      fill="currentColor"
      fillOpacity={0.3}
    />
  </svg>
);
