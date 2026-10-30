'use client';
// frontend/src/components/icons/smash/HeartIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** Smash or Pass: SMASH. A plain heart. Fill it with a `fill-*` class when it should be solid. */
export const HeartIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 20.5C5.5 16 3 12.6 3 9a4.5 4.5 0 0 1 9-1.6A4.5 4.5 0 0 1 21 9c0 3.6-2.5 7-9 11.5z" />
  </IconSvg>
);
