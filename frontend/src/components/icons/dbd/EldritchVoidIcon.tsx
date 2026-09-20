'use client';
// frontend/src/components/icons/dbd/EldritchVoidIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Smash-or-Pass tier: Eldritch Void -- a swirling void with a watching eye,
 * instead of the generic danger Skull.
 */
export const EldritchVoidIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <circle cx="12" cy="12" r="9" />
    <path d="M12 5a7 7 0 1 1-6.5 4.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
