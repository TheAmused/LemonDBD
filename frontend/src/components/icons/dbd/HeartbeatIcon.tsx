'use client';
// frontend/src/components/icons/dbd/HeartbeatIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Persona: red stain addict. A heartbeat line, the terror radius of a chase. */
export const HeartbeatIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M2 12h5l2-6 4 12 2-6h7" />
  </IconSvg>
);
