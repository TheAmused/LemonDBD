'use client';
// frontend/src/components/icons/ui/ChevronIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A right chevron (lucide ChevronRight's drawing); rotate it for the other directions. */
export const ChevronIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="m9 18 6-6-6-6" />
  </IconSvg>
);
