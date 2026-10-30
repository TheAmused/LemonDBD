'use client';
// frontend/src/components/icons/dbd/DiceIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Randomizer. A die. */
export const DiceIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" strokeWidth={3} />
  </IconSvg>
);
