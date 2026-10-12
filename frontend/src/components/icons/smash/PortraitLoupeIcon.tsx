'use client';
// frontend/src/components/icons/smash/PortraitLoupeIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: ZOOM. A portrait in corner brackets with a loupe over its corner.
 * Used for the "view the full portrait" button.
 */
export const PortraitLoupeIcon: React.FC<DbdIconProps> = ({
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
    {/* Corner brackets */}
    <path d="M3.5 8.8V5.6a2.1 2.1 0 0 1 2.1-2.1h3.2" />
    <path d="M15.2 3.5h3.2a2.1 2.1 0 0 1 2.1 2.1v3.2" />
    <path d="M3.5 15.2v3.2a2.1 2.1 0 0 0 2.1 2.1h3.2" />
    {/* Portrait */}
    <circle cx="9.6" cy="9.4" r="1.9" fill="currentColor" fillOpacity={0.2} />
    <path d="M6 15.6c.3-2 1.8-3.2 3.6-3.2 1 0 1.8.3 2.4.9" strokeWidth={1.4} />
    {/* Loupe */}
    <circle cx="15.2" cy="14.6" r="3.2" fill="currentColor" fillOpacity={0.12} />
    <path d="M17.6 17l3 3" strokeWidth={2.2} />
    <path d="M13.7 13.6a2 2 0 0 1 1.6-.8" strokeWidth={1} />
  </svg>
);
