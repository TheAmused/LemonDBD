'use client';
// frontend/src/components/icons/dbd/CurseIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** A skull: the curse wheel before any curse is active. */
export const CurseIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 3a8 8 0 0 0-8 8c0 2.8 1.4 5.1 3.5 6.5V20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2.5c2.1-1.4 3.5-3.7 3.5-6.5a8 8 0 0 0-8-8z" />
    <circle cx="9" cy="11" r="1.5" />
    <circle cx="15" cy="11" r="1.5" />
    <path d="M10.5 21v-2.5M13.5 21v-2.5" />
  </IconSvg>
);
