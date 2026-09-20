'use client';
// frontend/src/components/icons/dbd/FriendzoneIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Smash-or-Pass tier: Friendzone -- a handshake (liked, but strictly
 * platonic) instead of the generic protection Shield.
 */
export const FriendzoneIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M2 13l6-4 2.5 1.5" />
    <path d="M22 13l-6-4-2.5 1.5" />
    <rect x="8.5" y="10.5" width="3.2" height="5.5" rx="1.4" />
    <rect x="12.3" y="10.5" width="3.2" height="5.5" rx="1.4" />
  </svg>
);
