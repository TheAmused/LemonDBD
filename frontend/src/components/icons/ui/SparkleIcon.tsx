'use client';
// frontend/src/components/icons/ui/SparkleIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from '../dbd/types';

/** A four point sparkle: visual effects. */
export const SparkleIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" />
  </IconSvg>
);
