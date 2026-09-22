'use client';
// frontend/src/components/icons/dbd/RedStainIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona: The Red Stain Addict -- The Killer's Telltale Red Stain.
 * Upgraded & upscaled from a generic torch into the authentic DBD Red Stain:
 * an ominous forward-projected crimson cone of terror, with killer silhouette eye,
 * expanding conical light beam, ground impact pool, and suspended blood motes.
 */
export const RedStainIcon: React.FC<DbdIconProps> = ({
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
    {/* Killer's sinister gaze / projection origin point */}
    <path
      d="M9 3.5c1-1 2-1.5 3-1.5s2 .5 3 1.5c-1 1-2 1.5-3 1.5s-2-.5-3-1.5z"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.4}
    />
    <circle cx="12" cy="3.5" r="0.8" fill="currentColor" stroke="none" />

    {/* Primary Expanding Conical Red Stain Beam */}
    <path
      d="M12 4.5L2.5 18c3 2.5 6.5 3.5 9.5 3.5s6.5-1 9.5-3.5L12 4.5z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.12}
    />

    {/* Focused high-intensity inner beam core */}
    <path
      d="M12 4.5L6.5 17.5c2 1.5 3.5 2 5.5 2s3.5-.5 5.5-2L12 4.5z"
      fill="currentColor"
      fillOpacity={0.25}
      stroke="currentColor"
      strokeWidth={1.2}
    />

    {/* Elliptical Ground Impact Pool (The Red Stain on the floor) */}
    <ellipse
      cx="12"
      cy="18.5"
      rx="8.5"
      ry="3.2"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.3}
    />
    <ellipse cx="12" cy="18.5" rx="5" ry="1.8" fill="currentColor" fillOpacity={0.45} stroke="none" />

    {/* Radiating forward beam rays */}
    <path d="M12 5.5v11.5" strokeWidth={1.5} strokeDasharray="3 2" strokeOpacity={0.7} />
    <path d="M12 5.5l-4.5 11" strokeWidth={1.2} strokeOpacity={0.5} />
    <path d="M12 5.5l4.5 11" strokeWidth={1.2} strokeOpacity={0.5} />

    {/* Floating blood particles / dust motes caught in the red light */}
    <circle cx="9" cy="11.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="11.5" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="13" cy="15" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);
