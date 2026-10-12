'use client';
// frontend/src/components/icons/smash/FogEllipsisIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: MORE. Three beads drifting in a thread of fog. Used for the "more actions"
 * button of the hub header.
 */
export const FogEllipsisIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 1.8,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="5" cy="11" r="1.9" fill="currentColor" />
    <circle cx="12" cy="11" r="1.9" fill="currentColor" />
    <circle cx="19" cy="11" r="1.9" fill="currentColor" />
    <path d="M2.6 16.2c1.4 0 2-.8 3.4-.8s2 .8 3.4.8 2-.8 3.4-.8 2 .8 3.4.8 2-.8 3.4-.8" strokeWidth={1.2} />
    <path d="M5 19.6c1.2 0 1.7-.6 2.9-.6s1.7.6 2.9.6 1.7-.6 2.9-.6 1.7.6 2.9.6" strokeWidth={1} />
  </svg>
);
