'use client';
// frontend/src/components/icons/dbd/RiftPortalIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Sidebar nav: Challenges -- The Cosmic Rift tear.
 * Upgraded & upscaled with a jagged dimensional fracture, reality-warping
 * energy arcs, floating crystalline shards, and an unstable eldritch core.
 */
export const RiftPortalIcon: React.FC<DbdIconProps> = ({
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
    {/* Outer warping event horizon aura */}
    <path
      d="M7 2.5C10 5 8 9 9.5 12S8 18 6.5 21.5M17 2.5c-3 2.5-1 6.5-2.5 9.5s1.5 6 3 9.5"
      strokeWidth={1.3}
      strokeOpacity={0.4}
      strokeDasharray="3 2"
    />

    {/* Primary jagged cosmic rift fissure tear */}
    <path
      d="M12 1.5L9.5 5.5l3.2 3.2-4.2 3.8 5 4-2.8 3.5 1.3 4.5"
      strokeWidth={2}
    />
    <path
      d="M12 1.5l2.5 4-3.2 3.2 4.2 3.8-5 4 2.8 3.5-1.3 4.5"
      strokeWidth={2}
    />

    {/* Dimensional core glow */}
    <path
      d="M12 4l1.5 4-2 4 2.5 3.5-2 3.5"
      strokeWidth={1.2}
      strokeOpacity={0.7}
      strokeDasharray="1.5 1.5"
    />

    {/* Crackling lateral energy discharges */}
    <path d="M4 12h3.5l1.5-1.5" strokeWidth={1.4} strokeOpacity={0.8} />
    <path d="M20 12h-3.5l-1.5 1.5" strokeWidth={1.4} strokeOpacity={0.8} />
    <path d="M5.5 6.5l2.5 1.5" strokeWidth={1.2} strokeOpacity={0.6} />
    <path d="M18.5 17.5l-2.5-1.5" strokeWidth={1.2} strokeOpacity={0.6} />

    {/* Floating crystalline realm fragments */}
    <polygon points="3.5,8.5 4.5,7.5 5,8.8 4,9.5" fill="currentColor" stroke="none" />
    <polygon points="19.5,15.5 20.5,14.5 21,15.8 20,16.5" fill="currentColor" stroke="none" />
    <polygon points="17.5,7 18.5,6.2 19,7.2 18,8" fill="currentColor" stroke="none" />
    <polygon points="5.5,16.5 6.5,15.5 7,16.8 6,17.5" fill="currentColor" stroke="none" />
  </svg>
);
