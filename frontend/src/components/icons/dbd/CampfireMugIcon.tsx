'use client';
// frontend/src/components/icons/dbd/CampfireMugIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Support. A mug. */
export const CampfireMugIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
    <path d="M16 10h2a2 2 0 0 1 0 5h-2" />
    <path d="M8 3v2M12 3v2" />
  </IconSvg>
);
