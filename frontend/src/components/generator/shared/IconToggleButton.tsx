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
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={isActive}
        className={cn(
          'relative flex items-center gap-2 rounded-xl px-3.5 py-3 text-slate-400 transition-all duration-200 cursor-pointer hover:text-slate-100 hover:bg-slate-800/60',
          isActive && 'text-amber-400 bg-amber-500/10',
          className
        )}
      >
        {icon}
        {badge !== undefined && (
          <span className="text-[11px] font-black">{badge}</span>
        )}
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-bold text-slate-100 shadow-xl group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </div>
  );
};
