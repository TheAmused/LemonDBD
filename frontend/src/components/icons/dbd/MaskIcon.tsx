'use client';
// frontend/src/components/icons/dbd/MaskIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Characters. A theatre mask. */
export const MaskIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M5 4h14v8a7 7 0 0 1-14 0z" />
    <path d="M9 9v1M15 9v1" />
    <path d="M9 14c1.5 1.5 4.5 1.5 6 0" />
  </IconSvg>
);
