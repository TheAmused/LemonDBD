'use client';
// frontend/src/components/icons/ui/LockIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A padlock: locked, sign in required. */
export const LockIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </IconSvg>
);
