'use client';
// frontend/src/components/icons/dbd/TierEasyIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';
import { HookBase } from './HookBase';

/**
 * Difficulty tier: Easy -- the cold forged sacrificial hook awaiting its first offering.
 * Clean steel, fresh blood drip, and faint atmospheric entity claw scratches.
 */
export const TierEasyIcon: React.FC<DbdIconProps> = ({
  className,
  strokeWidth = 2,
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
    <HookBase />
    {/* Subtle Entity scratch marks signaling trial initiation */}
    <path d="M16 11l4-4" strokeWidth={1.5} strokeOpacity={0.4} strokeLinecap="round" />
    <path d="M18 14l3.5-3.5" strokeWidth={1.2} strokeOpacity={0.3} strokeLinecap="round" />
  </svg>
);
