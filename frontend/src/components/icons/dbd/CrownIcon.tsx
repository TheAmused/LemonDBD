'use client';
// frontend/src/components/icons/dbd/CrownIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Staff badge. A crown. */
export const CrownIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M4 17L3 7l5 4 4-6 4 6 5-4-1 10z" />
    <path d="M5 21h14" />
  </IconSvg>
);
