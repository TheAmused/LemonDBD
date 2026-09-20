'use client';
// frontend/src/components/icons/dbd/MoriCharmIcon.tsx

import React from 'react';
import type { DbdIconProps } from './types';

/**
 * Offering category: Memento Mori -- an etched bone/fang charm on a cord,
 * evoking DBD's Ivory/Ebony Mori talismans, rather than a plain skull.
 */
export const MoriCharmIcon: React.FC<DbdIconProps> = ({ className, ...props }) => (
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
    <circle cx="12" cy="4.5" r="1.5" />
    <path d="M12 6v2.5" />
    <path d="M9 10.5c0-1.5 1.3-2 3-2s3 .5 3 2v7c0 1.5-1.3 2-3 2s-3-.5-3-2z" />
    <path d="M10.3 13.5h3.4" />
    <path d="M10.3 16.5h3.4" />
  </svg>
);
