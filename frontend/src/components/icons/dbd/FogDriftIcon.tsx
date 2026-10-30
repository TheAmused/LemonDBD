'use client';
// frontend/src/components/icons/dbd/FogDriftIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Persona: fog romantic. Drifting mist lines. */
export const FogDriftIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0" />
  </IconSvg>
);
