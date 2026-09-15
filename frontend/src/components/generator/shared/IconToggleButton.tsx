// frontend/src/components/generator/shared/IconToggleButton.tsx
'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface IconToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: string | number;
  onClick: () => void;
  className?: string;
}

// One shared look for every toolbar icon (accent-red when active/hovered),
// matching every other toggle/active-state control on the site instead of
// each icon carrying its own neon-glow color.
export const IconToggleButton: React.FC<IconToggleButtonProps> = ({
  icon,
  label,
  isActive = false,
  badge,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 min-h-[42px] min-w-[42px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation transition-all duration-200 cursor-pointer bg-bg-surface border border-border-color shadow-xs hover:scale-105 active:scale-95',
        isActive
          ? 'text-accent-red bg-accent-red/10 border-accent-red/40 hover:bg-accent-red/15 hover:border-accent-red/60 hover:shadow-xs hover:shadow-accent-red/30'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated hover:border-border-color/80',
        className
      )}
    >
      {icon}
      {badge !== undefined && <span className="text-xs font-black">{badge}</span>}
    </button>
  );
};
