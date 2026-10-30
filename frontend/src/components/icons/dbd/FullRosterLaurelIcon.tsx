'use client';
// frontend/src/components/icons/dbd/FullRosterLaurelIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Achievement: full roster. A star. */
export const FullRosterLaurelIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </IconSvg>
);
