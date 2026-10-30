'use client';
// frontend/src/components/icons/dbd/RankPlacedIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Leaderboard rank 2 and 3. A medal. */
export const RankPlacedIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="9" r="6" />
    <path d="M8.5 14L7 21l5-3 5 3-1.5-7" />
  </IconSvg>
);
