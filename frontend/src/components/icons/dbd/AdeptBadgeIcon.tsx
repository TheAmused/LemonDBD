'use client';
// frontend/src/components/icons/dbd/AdeptBadgeIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Achievement badge: Adept Trial Mastery.
 * Upgraded & upscaled into a heraldic trial shield flanked by laurel branches,
 * swallow-tail ribbon pennants with fold creases, and an inner Adept starburst crest.
 */
export const AdeptBadgeIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 1.7,
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
    {/* Dual swallow-tail triumph ribbon pennants extending below */}
    <path
      d="M8.5 14.5L6 22.5l4.5-2 1.5.8"
      strokeWidth={1.6}
      fill="currentColor"
      fillOpacity={0.15}
    />
    <path
      d="M15.5 14.5L18 22.5l-4.5-2-1.5.8"
      strokeWidth={1.6}
      fill="currentColor"
      fillOpacity={0.15}
    />
    <path d="M7.8 17.5l2.5-1.2M16.2 17.5l-2.5-1.2" strokeWidth={1.2} strokeOpacity={0.7} />

    {/* Primary Heraldic Adept Shield */}
    <path
      d="M12 2.5c4 0 6.5 1 6.5 3v5.5c0 4.5-3.5 7.5-6.5 9-3-1.5-6.5-4.5-6.5-9V5.5c0-2 2.5-3 6.5-3z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.1}
    />

    {/* Inner beveled shield line */}
    <path
      d="M12 4.8c2.8 0 4.5.8 4.5 2.2v4c0 3.2-2.5 5.5-4.5 6.8-2-1.3-4.5-3.6-4.5-6.8V7c0-1.4 1.7-2.2 4.5-2.2z"
      strokeWidth={1.2}
      strokeOpacity={0.7}
    />

    {/* Flanking Laurel Leaf Wreath branches */}
    {/* Left laurel leaves */}
    <path d="M2.5 6.5c1 1.2 2 1 2.5.5M2 10.5c1.2.8 2.2.4 2.5-.2M3 14.5c1.2.5 2.2 0 2.5-.8" strokeWidth={1.4} strokeLinecap="round" />
    {/* Right laurel leaves */}
    <path d="M21.5 6.5c-1 1.2-2 1-2.5.5M22 10.5c-1.2.8-2.2.4-2.5-.2M21 14.5c-1.2.5-2.2 0-2.5-.8" strokeWidth={1.4} strokeLinecap="round" />

    {/* Central Adept Starburst Crest */}
    <polygon
      points="12,6.8 13.5,9.8 16.5,10.2 14.2,12.4 14.8,15.5 12,14 9.2,15.5 9.8,12.4 7.5,10.2 10.5,9.8"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="currentColor"
      strokeWidth={1.2}
    />
    <circle cx="12" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
