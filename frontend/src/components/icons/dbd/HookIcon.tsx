'use client';
// frontend/src/components/icons/dbd/HookIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Offering: hook distance. A sacrificial hook on its ring. */
export const HookIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="4.5" r="2.5" />
    <path d="M12 7v8a4 4 0 0 0 8 0v-3" />
  </IconSvg>
);
