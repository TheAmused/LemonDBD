'use client';
// frontend/src/components/icons/dbd/EldritchVoidIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Smash or Pass tier: void. An empty circle. */
export const EldritchVoidIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h8" />
  </IconSvg>
);
