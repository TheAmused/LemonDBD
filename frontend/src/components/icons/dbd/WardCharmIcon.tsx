'use client';
// frontend/src/components/icons/dbd/WardCharmIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Offering: Wards. A shield. */
export const WardCharmIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 3l8 3v5.5c0 4.7-3.3 8.2-8 9.5-4.7-1.3-8-4.8-8-9.5V6z" />
  </IconSvg>
);
