'use client';
// frontend/src/components/icons/smash/LanternQuestionIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: HELP. A trial lantern with a question mark burning inside it. Used for the
 * "how to play" button and menu entry.
 */
export const LanternQuestionIcon: React.FC<DbdIconProps> = ({
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
    {/* Handle and cap */}
    <path d="M9.6 3.6a2.4 2.4 0 0 1 4.8 0" strokeWidth={1.5} />
    <path d="M8 7.2c0-1.6 1.7-2.6 4-2.6s4 1 4 2.6z" fill="currentColor" fillOpacity={0.3} />
    {/* Glass */}
    <path d="M7.7 7.2h8.6l1.1 10.4H6.6z" fill="currentColor" fillOpacity={0.1} />
    <path d="M9.6 7.4l-.5 10M14.4 7.4l.5 10" strokeWidth={0.9} />
    {/* Base */}
    <path d="M5.8 17.6h12.4v2.3a1 1 0 0 1-1 1H6.8a1 1 0 0 1-1-1z" fill="currentColor" fillOpacity={0.3} />
    {/* The question */}
    <path d="M10.4 10.9a1.7 1.7 0 1 1 2.5 1.5c-.6.4-.9.8-.9 1.4" strokeWidth={1.4} />
    <circle cx="12" cy="15.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
