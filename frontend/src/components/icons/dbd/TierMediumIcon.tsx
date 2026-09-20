'use client';
// frontend/src/components/icons/dbd/TierMediumIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';
import { HookBase } from './HookBase';

/**
 * Difficulty tier: Medium -- the hook with a single ember catching on it.
 */
export const TierMediumIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
      d="M6.3 16.3c-.6-1-.3-2 .5-2.7-.2.9.2 1.3.7 1.4.3-1 0-1.6.6-2.1.5 1 .9 1.4.9 2.3a1.4 1.4 0 0 1-2.7 1.1z"
      fill="currentColor"
      fillOpacity={0.45}
      stroke="none"
    />
  </svg>
);
