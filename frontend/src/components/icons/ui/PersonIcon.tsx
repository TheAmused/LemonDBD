'use client';
// frontend/src/components/icons/ui/PersonIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A head and shoulders: a character without a portrait. */
export const PersonIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </IconSvg>
);
