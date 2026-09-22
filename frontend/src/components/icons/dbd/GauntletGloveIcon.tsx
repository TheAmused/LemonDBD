'use client';
// frontend/src/components/icons/dbd/GauntletGloveIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Challenge-mode identity: Gauntlet -- The Killer's Articulated Bladed Gauntlet.
 * Upgraded & upscaled with layered steel plates, heavy wrist guard, steel rivets,
 * and lethal curved razor talons extending from each finger.
 */
export const GauntletGloveIcon: React.FC<DbdIconProps> = ({
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
    {/* Heavy forearm vambrace base */}
    <path
      d="M6.5 21.5h11l-.8-6.5h-9.4z"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.12}
    />
    {/* Riveted vambrace reinforcement strap */}
    <path d="M6.2 18.5h11.6" strokeWidth={1.5} />
    <circle cx="8" cy="18.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="18.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="16" cy="18.5" r="0.6" fill="currentColor" stroke="none" />

    {/* Articulated back-of-hand knuckle guard plate */}
    <path
      d="M6 15l1.2-4.5h9.6L18 15"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.18}
    />
    <path d="M7.2 10.5h9.6" strokeWidth={1.6} />

    {/* Knuckle spike mounts */}
    <circle cx="8.5" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="11" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="13" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="10.5" r="0.7" fill="currentColor" stroke="none" />

    {/* Lethal curved razor claw talons extending from fingers */}
    {/* Index finger talon */}
    <path
      d="M7.8 10.5L7 6.5C6.8 4.5 5 3 4 2.5c.8 1.8 1.8 4 2.2 6"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.25}
    />
    {/* Middle finger talon (longest) */}
    <path
      d="M10.5 10.5l-.2-5C10.2 3 9.5 2 8.5 1.5c1 1.2 1.8 3.5 1.8 6"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.25}
    />
    {/* Ring finger talon */}
    <path
      d="M13.5 10.5l.2-5c.1-2.5 1-3.5 2-4-1 1.2-1.8 3.5-1.8 6"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.25}
    />
    {/* Pinky talon */}
    <path
      d="M16.2 10.5l.8-4c.2-2 2-3.5 3-4-.8 1.8-1.8 4-2.2 6"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.25}
    />

    {/* Spiked thumb blade on the side */}
    <path d="M6 14.5l-3-1.5c-.8-.5-1.2-1.2-1.5-2 .5.8 1.8 1.5 2.5 1.8l2 1.7" strokeWidth={1.5} fill="currentColor" fillOpacity={0.3} />
  </svg>
);
