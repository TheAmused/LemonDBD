'use client';
// frontend/src/components/icons/dbd/ClapperboardIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** A film clapperboard: animations, everywhere they can be switched on or off. */
export const ClapperboardIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M20.2 6L3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z" />
    <path d="M6.2 5.3l3.1 3.9M12.4 3.4l3.1 4" />
    <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </IconSvg>
);
