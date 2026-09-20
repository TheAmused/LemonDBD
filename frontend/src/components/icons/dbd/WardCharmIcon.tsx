'use client';
// frontend/src/components/icons/dbd/WardCharmIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Offering category: Wards -- a warding-rune amulet on a cord, in place of
 * the generic protection Shield.
 */
export const WardCharmIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <circle cx="12" cy="4.5" r="1.5" />
    <path d="M12 6v2.5" />
    <circle cx="12" cy="15.5" r="5.5" />
    <path d="M12 12l3 6h-6z" />
    <circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
