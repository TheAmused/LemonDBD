'use client';
// frontend/src/components/icons/dbd/BloodwebIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Randomizer -- DBD's own Bloodweb, a radiating web of nodes,
 * in place of the generic Dices.
 */
export const BloodwebIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <path d="M12 12V4M12 12l6.9-4M12 12l6.9 4M12 12v8M12 12l-6.9 4M12 12l-6.9-4" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="18.9" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="18.9" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="20" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5.1" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5.1" cy="8" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
