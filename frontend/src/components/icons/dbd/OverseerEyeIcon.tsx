'use client';
// frontend/src/components/icons/dbd/OverseerEyeIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Admin / staff badge -- a diamond emblem framing a watching eye, evoking
 * the Entity's own all-seeing oversight of every trial, in place of the
 * generic Crown used for "this user/section is admin/staff" everywhere it
 * appeared (page header, stat count, role badges, promote-button icon,
 * admin nav links, avatar corner badge, "developer response" marker).
 */
export const OverseerEyeIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 3l7 9-7 9-7-9z" />
    <path d="M8 12c1.5-2 2.5-3 4-3s2.5 1 4 3c-1.5 2-2.5 3-4 3s-2.5-1-4-3z" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
