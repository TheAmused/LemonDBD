'use client';
// frontend/src/components/icons/dbd/RankFirstIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Leaderboard rank 1. A crown. */
export const RankFirstIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />
  </IconSvg>
);
