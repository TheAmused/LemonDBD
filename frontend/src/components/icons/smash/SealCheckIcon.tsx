'use client';
// frontend/src/components/icons/smash/SealCheckIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: SELECTED. A wax seal pressed with a check mark. Used for the "active" badge
 * and the select button of the roster picker.
 */
export const SealCheckIcon: React.FC<DbdIconProps> = ({
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
    <path
      d="M12 2.6l2 1.6 2.5-.3 1 2.3 2.3 1-.3 2.5 1.6 2-1.6 2 .3 2.5-2.3 1-1 2.3-2.5-.3-2 1.6-2-1.6-2.5.3-1-2.3-2.3-1 .3-2.5-1.6-2 1.6-2-.3-2.5 2.3-1 1-2.3 2.5.3z"
      fill="currentColor"
      fillOpacity={0.15}
    />
    <path d="M8.2 12.3l2.5 2.5 5.1-5.3" strokeWidth={2.2} />
  </svg>
);
