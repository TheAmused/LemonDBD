'use client';
// frontend/src/components/icons/ui/MinusIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A minus (lucide Minus's drawing): zoom out. */
export const MinusIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M5 12h14" />
  </IconSvg>
);
