'use client';
// frontend/src/components/icons/dbd/SkillCheckGaugeIcon.tsx

import React from 'react';
import { IconSvg } from '../IconSvg';
import type { DbdIconProps } from './types';

/** Persona: pragmatist. A dial with a needle. */
export const SkillCheckGaugeIcon: React.FC<DbdIconProps> = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 12l4-4M12 3v2" />
  </IconSvg>
);
