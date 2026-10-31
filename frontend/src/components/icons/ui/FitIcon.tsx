'use client';
// frontend/src/components/icons/ui/FitIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** Two corner arrows pointing out (lucide Maximize2's drawing): fit the whole thing on screen. */
export const FitIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M15 3h6v6" />
    <path d="m21 3-7 7" />
    <path d="m3 21 7-7" />
    <path d="M9 21H3v-6" />
  </IconSvg>
);
