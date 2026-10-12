'use client';
// frontend/src/components/icons/smash/CardShuffleIcon.tsx

import React from 'react';
import type { DbdIconProps } from '../dbd/types';

/**
 * Smash or Pass: SHUFFLE. Two tarot cards fanned apart over a two-way arrow. Used for the
 * shuffle button and menu entry.
 */
export const CardShuffleIcon: React.FC<DbdIconProps> = ({
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
    {/* Cards */}
    <rect x="4.3" y="3.4" width="7.4" height="10.2" rx="1.4" transform="rotate(-10 8 8.5)" fill="currentColor" fillOpacity={0.14} />
    <rect x="12.3" y="4.6" width="7.4" height="10.2" rx="1.4" transform="rotate(10 16 9.7)" fill="currentColor" fillOpacity={0.14} />
    <circle cx="7.4" cy="7.6" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="16.6" cy="10.4" r="0.5" fill="currentColor" stroke="none" />
    {/* Two-way arrow */}
    <path d="M5 20.4h14" />
    <path d="M8 17.6l-3 2.8 3 2.8" />
    <path d="M16 17.6l3 2.8-3 2.8" />
  </svg>
);
