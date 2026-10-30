'use client';
// frontend/src/components/icons/ui/MusicIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** Two joined notes: background music. */
export const MusicIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </IconSvg>
);
