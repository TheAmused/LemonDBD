'use client';
// frontend/src/components/icons/ui/PlusIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A plus (lucide Plus's drawing): zoom in. */
export const PlusIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </IconSvg>
);
