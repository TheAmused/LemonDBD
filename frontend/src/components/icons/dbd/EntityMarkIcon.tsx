'use client';
// frontend/src/components/icons/dbd/EntityMarkIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona: The Eldritch Devotee -- The Entity's Branded Sigil.
 * Upgraded & upscaled into a sinister arachnid brand with jointed spider legs,
 * pincer mandibles, segmented chitin spine, and an enclosing broken ritual rune circle.
 */
export const EntityMarkIcon: React.FC<DbdIconProps> = ({
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
    {/* Enclosing broken ritual rune ring */}
    <circle
      cx="12"
      cy="12"
      r="9.5"
      strokeWidth={1.3}
      strokeDasharray="5 3 2 3"
      strokeOpacity={0.4}
    />

    {/* Entity Mandibles / Pincers at the crown */}
    <path d="M10 2.5l2 3-2 1.5M14 2.5l-2 3 2 1.5" strokeWidth={1.8} strokeLinecap="round" />

    {/* Segmented Chitin Carapace / Spine */}
    <path d="M12 4v16" strokeWidth={2.2} strokeLinecap="round" />
    <polygon points="12,5.5 13.5,8 12,9.5 10.5,8" fill="currentColor" stroke="none" />
    <polygon points="12,10.5 13.5,13 12,14.5 10.5,13" fill="currentColor" stroke="none" />
    <polygon points="12,15.5 13.5,18 12,19.5 10.5,18" fill="currentColor" stroke="none" />

    {/* Upper jointed spider legs */}
    <path
      d="M12 8L6.5 5 2.5 7.5"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <path
      d="M12 8l5.5-3 4 2.5"
      strokeWidth={1.8}
      strokeLinecap="round"
    />

    {/* Middle jointed spider legs (longest span) */}
    <path
      d="M12 13H5.5L1.8 14.5"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <path
      d="M12 13h6.5l3.7 1.5"
      strokeWidth={1.8}
      strokeLinecap="round"
    />

    {/* Lower jointed spider legs tapering downward */}
    <path
      d="M12 17.5l-5 2.5-3-1"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <path
      d="M12 17.5l5 2.5 3-1"
      strokeWidth={1.8}
      strokeLinecap="round"
    />

    {/* Entity dark ichor droplets */}
    <circle cx="12" cy="22" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="7" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="17" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);
