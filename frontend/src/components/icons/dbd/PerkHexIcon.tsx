'use client';
// frontend/src/components/icons/dbd/PerkHexIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Perks -- a DBD-style hexagonal perk frame with a small power
 * gem at its center, in place of the generic Sparkles.
 */
export const PerkHexIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 3l7 4v10l-7 4-7-4V7z" />
    <path d="M12 9l2.3 3-2.3 3-2.3-3z" fill="currentColor" fillOpacity={0.35} stroke="none" />
  </svg>
);
