'use client';
// frontend/src/components/icons/ui/TrashIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A bin with a lid: remove or delete. */
export const TrashIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v5M14 11v5" />
  </IconSvg>
);
