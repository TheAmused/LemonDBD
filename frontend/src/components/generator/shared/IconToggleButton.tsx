// frontend/src/components/generator/shared/IconToggleButton.tsx
'use client';

import React from 'react';
import { ToggleChip } from '@/components/common/ToggleChip';
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
// toggle on the site (accent-red tint when active).
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
    // Takes the height of the row it sits in (the Survivor/Killer toggle beside it), and the same
    // horizontal padding as that toggle's options.
    className={cn('min-w-hit self-stretch px-2 py-0 sm:min-w-11 sm:px-3 wide:px-4 pointer-coarse:min-w-11', className)}
  >
    {icon}
    {badge !== undefined && <span className="type-strong">{badge}</span>}
  </ToggleChip>
);
