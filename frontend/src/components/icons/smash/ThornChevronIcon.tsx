'use client';
// frontend/src/components/icons/smash/ThornChevronIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: NEXT. A chevron with thorns along its edge, pointing right (flip it with
 * `rotate-180` for "previous"). Used for the roster carousel arrows.
 */
export const ThornChevronIcon: React.FC<DbdIconProps> = ({
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
    <path d="M8.2 4.2L16 12l-7.8 7.8" strokeWidth={2.2} />
    <path d="M10.6 6.6L8.2 6M14 10l2.6-.9M14 14l2.6.9M10.6 17.4l-2.4.6" strokeWidth={1.2} />
  </svg>
);
