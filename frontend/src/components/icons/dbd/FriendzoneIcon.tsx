'use client';
// frontend/src/components/icons/dbd/FriendzoneIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Smash or Pass tier: friendzone. Two overlapping circles. */
export const FriendzoneIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="9" cy="12" r="5.5" />
    <circle cx="15" cy="12" r="5.5" />
  </IconSvg>
);
