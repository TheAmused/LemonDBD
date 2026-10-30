'use client';
// frontend/src/components/icons/dbd/MapIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Maps. A folded map. */
export const MapIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </IconSvg>
);
