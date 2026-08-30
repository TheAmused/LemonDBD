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
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        'relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-slate-400 transition-all duration-200 cursor-pointer hover:text-slate-100 hover:bg-slate-800/60',
        isActive && 'text-amber-400 bg-amber-500/10',
        className
      )}
    >
      {icon}
      {badge !== undefined && (
        <span className="text-[10px] font-black">{badge}</span>
      )}
    </button>
  );
};
