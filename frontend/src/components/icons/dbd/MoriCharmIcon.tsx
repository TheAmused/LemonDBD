'use client';
// frontend/src/components/icons/dbd/MoriCharmIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Offering: Memento Mori. A skull. */
export const MoriCharmIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 3a7 7 0 0 0-7 7c0 2.6 1.3 4.2 3 5.2V19h8v-3.8c1.7-1 3-2.6 3-5.2a7 7 0 0 0-7-7z" />
    <circle cx="9.5" cy="10.5" r="1" />
    <circle cx="14.5" cy="10.5" r="1" />
  </IconSvg>
);
