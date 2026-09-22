'use client';
// frontend/src/components/icons/dbd/MoriCharmIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Offering category: Memento Mori -- The Carved Ivory Skull Charm.
 * Upgraded & upscaled with a leather suspension loop, carved bone bead,
 * detailed cranium with hollow eye sockets, nasal cavity, serrated teeth,
 * ritual binding twine, and dangling bone feathers/needles.
 */
export const MoriCharmIcon: React.FC<DbdIconProps> = ({
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
    {/* Top twisted leather cord suspension ring */}
    <circle cx="12" cy="2.5" r="1.5" strokeWidth={1.5} />
    {/* Carved wooden/bone bead on cord */}
    <rect x="11" y="4" width="2" height="2" rx="0.5" strokeWidth={1.3} fill="currentColor" fillOpacity={0.3} />

    {/* Skull Talisman Cranium Silhouette */}
    <path
      d="M6.5 10c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4c0 2-1 3.5-1.5 4.5-.4.8-.5 1.8-.5 2.5h-7c0-.7-.1-1.7-.5-2.5C7.5 13.5 6.5 12 6.5 10z"
      strokeWidth={1.8}
      fill="currentColor"
      fillOpacity={0.12}
    />

    {/* Ritual leather twine wrapped across forehead */}
    <path d="M7 8.5c2.5-.5 7.5-.5 10 0" strokeWidth={1.4} />
    <path d="M6.8 9.8c2.5-.5 7.9-.5 10.4 0" strokeWidth={1.4} />

    {/* Hollow deep carved eye sockets */}
    <ellipse
      cx="9.5"
      cy="11.2"
      rx="1.4"
      ry="1.8"
      strokeWidth={1.4}
      fill="currentColor"
      fillOpacity={0.4}
    />
    <ellipse
      cx="14.5"
      cy="11.2"
      rx="1.4"
      ry="1.8"
      strokeWidth={1.4}
      fill="currentColor"
      fillOpacity={0.4}
    />

    {/* Triangular inverted nasal cavity */}
    <path d="M12 12.8l-.8 1.4h1.6z" fill="currentColor" stroke="none" />

    {/* Maxilla & carved skeletal teeth */}
    <path d="M9 17h6" strokeWidth={1.6} />
    <path d="M10.2 15.5v3M12 15.5v3M13.8 15.5v3" strokeWidth={1.2} strokeLinecap="round" />

    {/* Dangling ritual bone needles / feathers hanging from bottom of talisman */}
    <path d="M9 18.5l-1.5 4M15 18.5l1.5 4" strokeWidth={1.4} />
    <path d="M12 18.5v4.5" strokeWidth={1.6} />
    {/* Hanging beads */}
    <circle cx="7.5" cy="22.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="23" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="22.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
