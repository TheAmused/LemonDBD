'use client';
// frontend/src/components/icons/dbd/VeiledCompassIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona: The Untapped Soul -- The Veiled Compass.
 * Upgraded & upscaled into an antique maritime brass compass with mounting loop,
 * cardinal direction marks, faceted pointer needle, and heavy billowing fog banks
 * enshrouding its lower half.
 */
export const VeiledCompassIcon: React.FC<DbdIconProps> = ({
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
    {/* Top brass suspension ring / fob loop */}
    <circle cx="12" cy="2.5" r="1.5" strokeWidth={1.5} />
    <path d="M12 4v1.5" strokeWidth={1.8} />

    {/* Heavy outer brass compass bezel */}
    <circle
      cx="12"
      cy="11.5"
      r="8.5"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.06}
    />

    {/* Inner calibrated dial ring */}
    <circle cx="12" cy="11.5" r="6.8" strokeWidth={1.2} strokeDasharray="1.5 2" strokeOpacity={0.6} />

    {/* Cardinal direction ticks */}
    <path d="M12 5.5v1.5M12 17.5v-1.5M6 11.5h1.5M18 11.5h-1.5" strokeWidth={1.6} />

    {/* Faceted Magnetic Compass Needle (North filled, South hollow) */}
    {/* North needle point */}
    <polygon
      points="12,6.5 13.8,11.5 12,10.2"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1}
    />
    <polygon
      points="12,6.5 10.2,11.5 12,10.2"
      fill="currentColor"
      fillOpacity={0.4}
      stroke="currentColor"
      strokeWidth={1}
    />
    {/* South needle point */}
    <polygon
      points="12,16.5 13.5,11.5 12,12.5"
      stroke="currentColor"
      strokeWidth={1}
    />
    <polygon
      points="12,16.5 10.5,11.5 12,12.5"
      stroke="currentColor"
      strokeWidth={1}
    />
    {/* Center brass pivot pin */}
    <circle cx="12" cy="11.5" r="1.2" fill="currentColor" stroke="none" />

    {/* Thick rolling supernatural fog banks veiling the bottom */}
    <path
      d="M2 17.5c2.5-1.5 5.5-1.5 8 0s5.5 1.5 8 0 3.5-.8 4 .5"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <path
      d="M3 21c3-1.8 6.5-1.8 9.5 0s6 1.8 9 0"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeOpacity={0.8}
    />
    {/* Wisps of mist drifting over the compass face */}
    <path d="M8 15c2-1 4-1 6 0" strokeWidth={1.2} strokeOpacity={0.6} />
  </svg>
);
