'use client';
// frontend/src/components/icons/dbd/TrophyIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Achievements and best results. A cup. */
export const TrophyIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
    <path d="M12 14v4M8 21h8M10 18h4" />
  </IconSvg>
);
