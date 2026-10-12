'use client';
// frontend/src/components/icons/smash/CautionVeilIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: WARNING. A caution sign with fog creeping over its base. Used for the
 * mature-content badge and gate.
 */
export const CautionVeilIcon: React.FC<DbdIconProps> = ({
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
    <path d="M12 3L2.8 19h18.4z" fill="currentColor" fillOpacity={0.12} />
    <path d="M12 9v4.6" strokeWidth={2} />
    <circle cx="12" cy="16.3" r="0.9" fill="currentColor" stroke="none" />
    {/* Fog over the base */}
    <path d="M3.4 22c1.5 0 2.2-.8 3.6-.8s2.1.8 3.6.8 2.2-.8 3.6-.8 2.1.8 3.6.8" strokeWidth={1.2} />
  </svg>
);
