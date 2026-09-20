'use client';
// frontend/src/components/icons/dbd/TierEasyIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';
import { HookBase } from './HookBase';

/**
 * Difficulty tier: Easy -- the bare hook, no flame yet.
 */
export const TierEasyIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <HookBase />
  </svg>
);
