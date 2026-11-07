'use client';
// frontend/src/components/icons/ui/FiltersIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** Three sliders (lucide SlidersHorizontal's drawing): the filters button. */
export const FiltersIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
  </IconSvg>
);
