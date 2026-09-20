'use client';
// frontend/src/components/icons/dbd/ChaosSwirlIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Challenge-mode identity: Chaos -- a jagged energy burst, in place of the
 * borrowed Skull/Zap (this mode is about randomized perks, not danger).
 */
export const ChaosSwirlIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
    <path d="M5.5 5.5l3 3M15.5 15.5l3 3M18.5 5.5l-3 3M8.5 15.5l-3 3" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
