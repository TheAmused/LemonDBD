'use client';
// frontend/src/components/icons/dbd/SkillCheckGaugeIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Romance Persona archetype: The Cold Hearted Pragmatist -- DBD's own
 * skill-check gauge (a ring with a precise success-zone wedge and a needle
 * landing dead in it), in place of the generic Zap, since this persona is
 * defined by calculated efficiency rather than passion.
 */
export const SkillCheckGaugeIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="8" />
    <path
      d="M12 4a8 8 0 0 1 5.7 2.4l-3.4 3.4a3.6 3.6 0 0 0-2.3-.8z"
      fill="currentColor"
      fillOpacity={0.35}
      stroke="none"
    />
    <path d="M12 12l4.3-4.3" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
