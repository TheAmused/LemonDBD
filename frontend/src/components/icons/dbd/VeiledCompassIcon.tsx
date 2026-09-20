'use client';
// frontend/src/components/icons/dbd/VeiledCompassIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona archetype: The Untapped Soul -- a compass with a
 * half-formed needle, drifting fog beneath it, in place of the generic
 * Compass used before any votes have revealed a profile.
 */
export const VeiledCompassIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <circle cx="12" cy="9" r="6" />
    <path d="M12 9l2.5-2.5" />
    <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
    <path d="M2.5 18c1.6-1.1 3.2-1.1 4.8 0s3.2 1.1 4.8 0 3.2-1.1 4.8 0 3.2 1.1 4.8 0" />
  </svg>
);
