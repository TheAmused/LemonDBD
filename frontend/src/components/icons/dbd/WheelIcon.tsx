'use client';
// frontend/src/components/icons/dbd/WheelIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** A spoked wheel: the curse wheel before any curse is active. */
export const WheelIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 3v7M12 14v7M3 12h7M14 12h7" />
  </IconSvg>
);
