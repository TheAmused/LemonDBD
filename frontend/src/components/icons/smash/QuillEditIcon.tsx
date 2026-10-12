'use client';
// frontend/src/components/icons/smash/QuillEditIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: EDIT. A feather quill. Used for editing a custom roster.
 */
export const QuillEditIcon: React.FC<DbdIconProps> = ({
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
    {/* Feather */}
    <path
      d="M20.8 3.2c-6.4.2-11.2 3.9-12.7 10.3L7 18l4.5-1.1c6.4-1.5 9.9-6.3 9.3-13.7z"
      fill="currentColor"
      fillOpacity={0.15}
    />
    {/* Spine */}
    <path d="M4.6 21.4l9.4-9.4" strokeWidth={1.5} />
    {/* Barbs */}
    <path d="M12.6 12.6l3.4-.5M10.6 14.6l3-.3M14.4 9.6l3.2-.6" strokeWidth={1} />
  </svg>
);
