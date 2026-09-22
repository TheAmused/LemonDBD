'use client';
// frontend/src/components/icons/dbd/EldritchVoidIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Smash-or-Pass tier: Eldritch Void -- The Abyssal Singularity.
 * Upgraded & upscaled with a gravitational event horizon, writhing eldritch tentacles
 * reaching from the abyss, suckers/barbs, collapsing soul motes, and a deep void eye.
 */
export const EldritchVoidIcon: React.FC<DbdIconProps> = ({
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
    {/* Outer event horizon distortion boundary */}
    <circle
      cx="12"
      cy="12"
      r="9.8"
      strokeWidth={1.8}
      strokeDasharray="4 2 1 2"
      strokeOpacity={0.5}
    />

    {/* Primary Eldritch Tentacle #1: Sweeping from top-right into center */}
    <path
      d="M19.5 5.5c-2.5 0-5 2.5-5 5.5 0 2 1.5 3 2.5 2"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <circle cx="17.5" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="15.8" cy="9.5" r="0.5" fill="currentColor" stroke="none" />

    {/* Primary Eldritch Tentacle #2: Reaching from bottom-left up into core */}
    <path
      d="M4.5 18.5c2.5 0 5-2.5 5-5.5 0-2-1.5-3-2.5-2"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <circle cx="6.5" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="8.2" cy="14.5" r="0.5" fill="currentColor" stroke="none" />

    {/* Secondary curling tentacle reaching from top-left */}
    <path
      d="M5.5 5.5C8 7 10 9 10.5 12"
      strokeWidth={1.7}
      strokeLinecap="round"
    />
    {/* Secondary curling tentacle reaching from bottom-right */}
    <path
      d="M18.5 18.5c-2.5-1.5-4.5-3.5-5-6.5"
      strokeWidth={1.7}
      strokeLinecap="round"
    />

    {/* Gravitational accretion vortex ring */}
    <circle
      cx="12"
      cy="12"
      r="4.8"
      strokeWidth={1.5}
      fill="currentColor"
      fillOpacity={0.25}
    />

    {/* Unblinking cosmic void eye / dark core */}
    <ellipse cx="12" cy="12" rx="2.5" ry="3.2" strokeWidth={1.4} fill="currentColor" fillOpacity={0.6} />
    <ellipse cx="12" cy="12" rx="1" ry="1.8" fill="currentColor" stroke="none" />

    {/* Vanishing soul motes being pulled into the void */}
    <circle cx="3" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="21" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="21.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="2.5" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);
