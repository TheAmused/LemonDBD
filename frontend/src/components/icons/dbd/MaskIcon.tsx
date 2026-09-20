'use client';
// frontend/src/components/icons/dbd/MaskIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Characters -- a stitched killer mask, in place of the
 * generic Users, since DBD's cast is most recognizable by its masks.
 */
export const MaskIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 3c-4 0-7 3-7 7v4c0 4 3 7 7 7s7-3 7-7v-4c0-4-3-7-7-7z" />
    <path d="M5 9L3 8M19 9l2-1" />
    <circle cx="9.3" cy="11" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.7" cy="11" r="1" fill="currentColor" stroke="none" />
    <path d="M9.3 16c1 .8 3.7.8 4.7 0" />
  </svg>
);
