// frontend/src/components/generator/shared/IconToggleButton.tsx
'use client';

import React from 'react';
import { ToggleChip } from '@/components/common/ToggleChip';

interface IconToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  onClick: () => void;
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
    className={className ? `min-w-[42px] px-2.5 sm:min-w-[44px] ${className}` : 'min-w-[42px] px-2.5 sm:min-w-[44px]'}
  >
    {icon}
    {badge !== undefined && <span className="type-strong">{badge}</span>}
  </ToggleChip>
);
