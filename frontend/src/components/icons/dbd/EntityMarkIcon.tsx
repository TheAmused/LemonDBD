'use client';
// frontend/src/components/icons/dbd/EntityMarkIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Persona: devotee. An asterisk. */
export const EntityMarkIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
  </IconSvg>
);
