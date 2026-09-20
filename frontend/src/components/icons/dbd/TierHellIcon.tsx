'use client';
// frontend/src/components/icons/dbd/TierHellIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';
import { HookBase } from './HookBase';

/**
 * Difficulty tier: Hell -- the hook fully engulfed.
 */
export const TierHellIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <HookBase />
    <path
      d="M4.8 19c-1-1.6-.6-3 .6-4-.3 1.4.3 2 1 2.2.5-1.6 0-2.5 1-3.3.7 1.6 1.4 2.2 1.4 3.6a2.2 2.2 0 0 1-4 1.5z"
      fill="currentColor"
      fillOpacity={0.6}
      stroke="none"
    />
    <path
      d="M9.2 16.8c-.5-.8-.3-1.5.3-2-.1.7.1 1 .4.9.2-.6 0-1 .5-1.3.4.7.7 1 .7 1.6a1 1 0 0 1-1.9.8z"
      fill="currentColor"
      fillOpacity={0.6}
      stroke="none"
    />
  </svg>
);
