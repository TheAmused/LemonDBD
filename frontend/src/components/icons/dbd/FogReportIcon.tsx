'use client';
// frontend/src/components/icons/dbd/FogReportIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Report a bug / issue -- a torn, fog-warped message bubble with an
 * exclamation mark, in place of the generic insect Bug. "Something's
 * wrong, flag it" reads more at home as a message sent through the Fog
 * than as a literal bug.
 */
export const FogReportIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 3c-4.5 0-8 3.3-8 7.5S7.5 18 12 18c.4 0 .8 0 1.2-.1L17 20l-.8-3.2c1.7-1.3 2.8-3.2 2.8-5.2C19 6.3 16.5 3 12 3z" />
    <path d="M12 8v4.5" />
    <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>
);
