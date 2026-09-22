'use client';
// frontend/src/components/icons/dbd/FriendzoneIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Smash-or-Pass tier: Friendzone -- Survivor Handshake / Trial Alliance.
 * Upgraded & upscaled from basic geometric blocks into a detailed mutual
 * survivor wrist-clasp with articulated fingers, thumbs, forearm sleeves,
 * trial bandage wraps, and a protective solidarity bond loop.
 */
export const FriendzoneIcon: React.FC<DbdIconProps> = ({
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
    {/* Left survivor arm and wrapped sleeve/cuff */}
    <path d="M1.5 14l4.5-3 3 1.5" strokeWidth={2} strokeLinecap="round" />
    <path d="M1.5 17.5l4-2.5" strokeWidth={1.8} strokeLinecap="round" />
    {/* Left wrist bandage wrap */}
    <path d="M4 11.5l1.5 4" strokeWidth={1.4} strokeOpacity={0.7} />
    <path d="M5.8 10.5l1.5 4" strokeWidth={1.4} strokeOpacity={0.7} />

    {/* Right survivor arm and wrapped sleeve/cuff */}
    <path d="M22.5 14l-4.5-3-3 1.5" strokeWidth={2} strokeLinecap="round" />
    <path d="M22.5 17.5l-4-2.5" strokeWidth={1.8} strokeLinecap="round" />
    {/* Right wrist bandage wrap */}
    <path d="M20 11.5l-1.5 4" strokeWidth={1.4} strokeOpacity={0.7} />
    <path d="M18.2 10.5l-1.5 4" strokeWidth={1.4} strokeOpacity={0.7} />

    {/* Center clasped hands and interlocking fingers */}
    {/* Thumb arches */}
    <path d="M9 12.5C9 10 10.5 9 12 9s3 1 3 3.5" strokeWidth={1.8} />

    {/* Finger 1 (left hand grip) */}
    <rect x="8.5" y="11.5" width="3.2" height="6.5" rx="1.6" strokeWidth={1.8} fill="currentColor" fillOpacity={0.15} />
    {/* Finger 2 (right hand grip) */}
    <rect x="12.3" y="11.5" width="3.2" height="6.5" rx="1.6" strokeWidth={1.8} fill="currentColor" fillOpacity={0.15} />

    {/* Knuckle separation creases */}
    <path d="M8.5 14.5h3.2M12.3 14.5h3.2" strokeWidth={1.2} strokeOpacity={0.7} />

    {/* Survivor Camaraderie / Solidarity bond spark above handshake */}
    <path d="M12 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
