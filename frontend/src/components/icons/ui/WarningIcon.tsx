'use client';
// frontend/src/components/icons/ui/WarningIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A warning triangle (lucide TriangleAlert's drawing, used elsewhere for warnings). */
export const WarningIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4M12 17h.01" />
  </IconSvg>
);
