'use client';
// frontend/src/components/icons/smash/CardStackIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** Smash or Pass: cards left in the deck, and the roster/deck marker. Two stacked cards. */
export const CardStackIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <rect x="8" y="3" width="12" height="16" rx="2" />
    <path d="M4 7v11a3 3 0 0 0 3 3h9" />
  </IconSvg>
);
