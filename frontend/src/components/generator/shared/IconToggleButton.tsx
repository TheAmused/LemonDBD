// frontend/src/components/generator/shared/IconToggleButton.tsx
'use client';

import React from 'react';
import { ToggleChip } from '@/components/common/ToggleChip';
import { CONTROL_H } from '@/components/perks/PerkSearchBox';
import { cn } from '@/utils/cn';

interface IconToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  /** Omitted for a purely informational icon whose tooltip is the point. */
  onClick?: () => void;
  className?: string;
}

// A toolbar icon with an optional count badge: a ToggleChip, so it matches every other
// toggle on the site (accent-red tint when active). It is as tall as the Survivor/Killer toggle beside it.
export const IconToggleButton: React.FC<IconToggleButtonProps> = ({
  icon,
  label,
  isActive = false,
  badge,
  onClick,
  className,
}) => (
  <ToggleChip
    pressed={isActive}
    size="md"
    onClick={onClick}
    aria-label={label}
    className={cn('min-w-hit px-2.5 sm:min-w-11 pointer-coarse:min-w-11', CONTROL_H, className)}
  >
    {icon}
    {badge !== undefined && <span className="type-strong">{badge}</span>}
  </ToggleChip>
);
