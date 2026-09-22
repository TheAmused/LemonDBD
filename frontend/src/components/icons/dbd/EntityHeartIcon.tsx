'use client';
// frontend/src/components/icons/dbd/EntityHeartIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona: The Entity's Paramour -- The Terror Radius Heart.
 * Upgraded & upscaled with aorta vessels, anatomical ventricular contour,
 * thorny Entity spider claws squeezing the heart, dripping essence, and
 * radiating terror-radius pulse waves.
 */
export const EntityHeartIcon: React.FC<DbdIconProps> = ({
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
    {/* Aorta and pulmonary artery branches at the top of the heart */}
    <path d="M9.5 2.5v3.5M13.5 2v4M15 3.5l1.5-1" strokeWidth={1.6} />

    {/* Primary Terror Radius Heart contour */}
    <path
      d="M12 21.5S4 16.5 4 10.5A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 8 4.5c0 6-8 11-8 11z"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.15}
    />

    {/* Entity Spider-Claw #1: Reaching from the left and gripping across the heart */}
    <path
      d="M1.5 8.5L5 10l5-1.5"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <path d="M7 11.5l3.5.5" strokeWidth={1.4} strokeLinecap="round" />

    {/* Entity Spider-Claw #2: Reaching from the right and constricting the center */}
    <path
      d="M22.5 8.5L19 10l-5-1.5"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <path d="M17 11.5l-3.5.5" strokeWidth={1.4} strokeLinecap="round" />

    {/* Barbed Entity claw wrapping the apex from below */}
    <path
      d="M12 18c-2.5-1-4-3-4.5-5M12 18c2.5-1 4-3 4.5-5"
      strokeWidth={1.5}
      strokeOpacity={0.7}
    />

    {/* Thorns piercing the heart wall */}
    <path d="M7 8l-1.5-1M17 8l1.5-1" strokeWidth={1.4} />

    {/* Dripping terror essence / blood droplets */}
    <path
      d="M12 21.5c-.6.8-1 1.5-1 2a1 1 0 0 0 2 0c0-.5-.4-1.2-1-2z"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="9.5" cy="15" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="15" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
