'use client';
// frontend/src/components/icons/ui/CardFlipIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A rounded arrow curving up to the left: turn the card over. */
export const CardFlipIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M19 19C19 11 14 6 6 6M10 2L6 6l4 4" />
  </IconSvg>
);
