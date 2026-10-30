'use client';
// frontend/src/components/icons/ui/MedkitIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A first aid case with a cross. */
export const MedkitIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5h6v2M12 11v5M9.5 13.5h5" />
  </IconSvg>
);
