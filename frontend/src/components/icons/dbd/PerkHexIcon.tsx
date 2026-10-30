'use client';
// frontend/src/components/icons/dbd/PerkHexIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Perks: the perk diamond. */
export const PerkHexIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 2.5L21.5 12 12 21.5 2.5 12z" />
    <path d="M12 8l4 4-4 4-4-4z" />
  </IconSvg>
);
