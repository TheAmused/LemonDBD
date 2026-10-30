'use client';
// frontend/src/components/icons/dbd/FogReportIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Report a bug. A speech bubble with an exclamation mark. */
export const FogReportIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M12 8v3M12 13.5v.01" />
  </IconSvg>
);
