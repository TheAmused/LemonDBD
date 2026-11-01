'use client';
// frontend/src/components/icons/ui/InfoIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A circled "i" (lucide Info's drawing): a note the reader should see before the text. */
export const InfoIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </IconSvg>
);
