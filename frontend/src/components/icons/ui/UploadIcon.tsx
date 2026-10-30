'use client';
// frontend/src/components/icons/ui/UploadIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** An arrow up out of a tray (lucide Upload's drawing, used elsewhere for uploads). */
export const UploadIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 3v12M17 8l-5-5-5 5" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
  </IconSvg>
);
