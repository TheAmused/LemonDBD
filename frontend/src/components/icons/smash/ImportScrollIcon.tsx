'use client';
// frontend/src/components/icons/smash/ImportScrollIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: IMPORT. An arrow rising from a tray, a heart on the tray. Used for importing a
 * roster file.
 */
export const ImportScrollIcon: React.FC<DbdIconProps> = ({
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
    {/* Arrow */}
    <path d="M12 14.4V3.8" />
    <path d="M7.8 7.8L12 3.6l4.2 4.2" />
    {/* Tray */}
    <path d="M3.8 14.6v4.2a1.6 1.6 0 0 0 1.6 1.6h13.2a1.6 1.6 0 0 0 1.6-1.6v-4.2" fill="currentColor" fillOpacity={0.1} />
    <path
      d="M12 19.2c-1.2-.8-1.7-1.3-1.7-1.9a.9.9 0 0 1 1.7-.3.9.9 0 0 1 1.7.3c0 .6-.5 1.1-1.7 1.9z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);
