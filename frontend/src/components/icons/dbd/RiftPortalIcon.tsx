'use client';
// frontend/src/components/icons/dbd/RiftPortalIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Challenges -- a torn rift between trials, in place of the
 * generic Swords (DBD isn't really a sword game; entering successive trials
 * through a tear in the fog is).
 */
export const RiftPortalIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M9 2c1 3-2 5-1 8s3 3 2 6-3 4-2 6" />
    <path d="M15 2c-1 3 2 5 1 8s-3 3-2 6 3 4 2 6" />
    <path d="M4.5 12h-2M21.5 12h-2" />
  </svg>
);
