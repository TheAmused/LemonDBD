'use client';
// frontend/src/components/icons/ui/PagesIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A sheet with a folded corner (lucide File's drawing): a page of perks in Page Streak. It means "page" and nothing else. */
export const PagesIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </IconSvg>
);
