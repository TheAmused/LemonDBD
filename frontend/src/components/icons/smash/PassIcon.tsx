'use client';
// frontend/src/components/icons/smash/PassIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** Smash or Pass: PASS. A plain cross, the opposite of the smash heart. */
export const PassIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </IconSvg>
);
