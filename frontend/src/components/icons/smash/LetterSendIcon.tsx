'use client';
// frontend/src/components/icons/smash/LetterSendIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: SHARE / EXPORT. A sealed letter with a heart on the wax. Used for exporting
 * a custom roster.
 */
export const LetterSendIcon: React.FC<DbdIconProps> = ({
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
    {/* Envelope */}
    <path d="M3 7h18v11.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" fill="currentColor" fillOpacity={0.1} />
    {/* Flap */}
    <path d="M3.4 7.4L12 13.8l8.6-6.4" />
    {/* Heart seal */}
    <path
      d="M12 17.6c-1.5-1-2.1-1.7-2.1-2.5a1.1 1.1 0 0 1 2.1-.4 1.1 1.1 0 0 1 2.1.4c0 .8-.6 1.5-2.1 2.5z"
      fill="currentColor"
      stroke="none"
    />
    {/* Motion */}
    <path d="M15.5 3.4h5M18 1.4l2.5 2-2.5 2" strokeWidth={1.3} />
  </svg>
);
