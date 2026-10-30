'use client';
// frontend/src/components/icons/dbd/TargetIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Challenges. A target. */
export const TargetIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <path d="M12 12h.01" strokeWidth={3} />
  </IconSvg>
);
