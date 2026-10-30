'use client';
// frontend/src/components/icons/IconSvg.tsx

import React from 'react';
import type { DbdIconProps } from './dbd/types';

/**
 * Shared frame for the simple custom icons: 24 px grid, one 2 px stroke, round caps and joins,
 * no fills. Draw shapes with plain strokes only so the icon reads at 16 px.
 */
export const IconSvg: React.FC<DbdIconProps> = ({ strokeWidth = 2, children, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);
