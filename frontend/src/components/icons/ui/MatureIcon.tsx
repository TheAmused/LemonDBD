'use client';
// frontend/src/components/icons/ui/MatureIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** Lips: mature (18+) content. */
export const MatureIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M2 12C4 8 7 5.5 9 5.5c1.4 0 2.2 1.2 3 2.2.8-1 1.6-2.2 3-2.2 2 0 5 2.5 7 6.5-3 5-6.5 7-10 7S5 17 2 12z" />
    <path d="M5 12c2.5.6 4.5-.4 7 .6 2.5-1 4.5 0 7-.6" />
  </IconSvg>
);
