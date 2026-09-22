'use client';
// frontend/src/components/icons/dbd/CampfireMugIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Support / Buy Me a Coffee: The Campfire Enamel Mug.
 * Upgraded & upscaled with a rolled enamel rim, heavy camping mug handle,
 * swirling hot steam ribbons mingling into fog, and a stamped campfire flame insignia.
 */
export const CampfireMugIcon: React.FC<DbdIconProps> = ({
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
    {...props}
  >
    {/* Swirling hot steam wisps rising into the Fog */}
    <path
      d="M7.5 5.5c0-1.5 1-2 1-3.5"
      strokeWidth={1.4}
      strokeLinecap="round"
    />
    <path
      d="M11.5 5c0-1.8 1.5-2.2 1.5-4"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <path
      d="M15.5 5.5c0-1.2.8-1.8.8-3"
      strokeWidth={1.3}
      strokeLinecap="round"
    />

    {/* Enamel mug rolled top rim */}
    <rect x="3.5" y="7" width="14" height="2" rx="1" strokeWidth={1.8} fill="currentColor" fillOpacity={0.2} />

    {/* Main mug body */}
    <path
      d="M4.5 9v7.5c0 3 2.5 5 6 5s6-2 6-5V9z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.08}
    />

    {/* Heavy curved tin mug handle */}
    <path
      d="M16.5 9.5h2.5c1.8 0 3 1.2 3 3v2c0 1.8-1.2 3-3 3h-2.5"
      strokeWidth={2}
      strokeLinecap="round"
    />

    {/* Stamped Campfire Flame emblem on mug face */}
    {/* Outer flame */}
    <path
      d="M10.5 11c1 1.2 2 2.2 2 3.5a2 2 0 0 1-4 0c0-1.3 1-2.3 2-3.5z"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="currentColor"
      strokeWidth={1.2}
    />
    {/* Inner flame core */}
    <path
      d="M10.5 13.5c.4.6.8 1 .8 1.5a.8.8 0 1 1-1.6 0c0-.5.4-.9.8-1.5z"
      fill="currentColor"
      stroke="none"
    />

    {/* Bottom mug rim bevel */}
    <path d="M6 21.5h9" strokeWidth={1.5} strokeOpacity={0.7} />
  </svg>
);
