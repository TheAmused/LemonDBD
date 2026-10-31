'use client';
// frontend/src/components/icons/ui/ImageIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A framed picture with a sun and a hill: an image or screenshot. */
export const ImageIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="M21 15l-4.5-4.5L6 21" />
  </IconSvg>
);
