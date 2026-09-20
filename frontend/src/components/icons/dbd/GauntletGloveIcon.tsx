'use client';
// frontend/src/components/icons/dbd/GauntletGloveIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Challenge-mode identity: Gauntlet -- an armored gauntlet glove, matching
 * the mode's own name, in place of borrowed Trophy/Skull.
 */
export const GauntletGloveIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M7 21v-7a5 5 0 0 1 10 0v7z" />
    <path d="M7 16h10M7 18.5h10" />
    <path d="M7 15.5c-1.8.3-3 1.5-3 3.5s1.5 3.3 3.5 3" />
  </svg>
);
