'use client';
// frontend/src/components/icons/dbd/RealmMapIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Map Explorer -- a folded realm map with a marked location,
 * in place of the generic Compass.
 */
export const RealmMapIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" />
    <path d="M9 4v14M15 6v14" />
    <circle cx="12" cy="11" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
