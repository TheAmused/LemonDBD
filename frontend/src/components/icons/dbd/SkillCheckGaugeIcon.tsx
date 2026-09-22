'use client';
// frontend/src/components/icons/dbd/SkillCheckGaugeIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona: The Cold Hearted Pragmatist -- The DBD Skill Check Ring.
 * Upgraded & upscaled with a calibrated circular dial, Great & Good Skill Check
 * success zones, precision indicator needle, center hub, and a great-skill-check hit spark.
 */
export const SkillCheckGaugeIcon: React.FC<DbdIconProps> = ({
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
    {/* Outer circular skill check dial rim */}
    <circle
      cx="12"
      cy="12"
      r="9.5"
      strokeWidth={2}
      fill="currentColor"
      fillOpacity={0.06}
    />

    {/* Inner calibrated tick ring */}
    <circle cx="12" cy="12" r="7.5" strokeWidth={1.2} strokeDasharray="1 3" strokeOpacity={0.5} />

    {/* Good Skill Check Zone (wide success arc from 1 o'clock to 3:30) */}
    <path
      d="M15.5 3.5A9.5 9.5 0 0 1 21.5 12l-4.5 0A5 5 0 0 0 14 5.5z"
      fill="currentColor"
      fillOpacity={0.25}
      stroke="currentColor"
      strokeWidth={1}
    />

    {/* Great Skill Check Zone (narrow high-stakes precision bar at start of arc) */}
    <path
      d="M15.5 3.5A9.5 9.5 0 0 1 18 5.2l-2.4 2.8A5 5 0 0 0 14 5.5z"
      fill="currentColor"
      fillOpacity={0.7}
      stroke="currentColor"
      strokeWidth={1.2}
    />

    {/* Gauge calibration ticks around perimeter */}
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" strokeWidth={1.5} />
    <path d="M5.3 5.3l1.4 1.4M5.3 18.7l1.4-1.4" strokeWidth={1.2} strokeOpacity={0.6} />

    {/* Precision Sweep Needle landing dead in the Great Skill Check zone */}
    <path
      d="M12 12L16.2 4.8"
      strokeWidth={2.2}
      strokeLinecap="round"
    />

    {/* Great Skill Check Success Hit Spark! */}
    <path
      d="M16.5 2.5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z"
      fill="currentColor"
      stroke="none"
    />

    {/* Center needle pivot hub */}
    <circle cx="12" cy="12" r="2.2" strokeWidth={1.6} fill="currentColor" fillOpacity={0.4} />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
