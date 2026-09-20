'use client';
// frontend/src/components/icons/dbd/KillerIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Killer role icon -- a bloody dagger. Handle + crossguard + triangular
 * blade tapering to a point, with a small filled blood-drop accent
 * dripping off the blade. Evokes the killer's melee weapon rather than a
 * generic "danger" skull.
 */
export const KillerIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    {/* handle */}
    <path d="M12 2v6" />
    {/* pommel cap */}
    <path d="M10 2h4" />
    {/* crossguard */}
    <path d="M7 8h10" />
    {/* blade, tapering to a point */}
    <path d="M8 8l4 12 4-12" />
    {/* blood drop dripping off the blade */}
    <path
      d="M15.6 12.3c.9 1.1 1.4 2 1.4 2.7a1.5 1.5 0 0 1-3 0c0-.7.5-1.6 1.4-2.7a.2.2 0 0 1 .2 0z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);
