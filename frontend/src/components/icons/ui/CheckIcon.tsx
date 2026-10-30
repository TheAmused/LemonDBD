'use client';
// frontend/src/components/icons/ui/CheckIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A tick (lucide Check's drawing, used elsewhere for done). */
export const CheckIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M20 6 9 17l-5-5" />
  </IconSvg>
);
