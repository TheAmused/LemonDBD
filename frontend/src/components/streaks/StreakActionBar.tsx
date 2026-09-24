'use client';
// frontend/src/components/streaks/StreakActionBar.tsx

import React from 'react';

/** Fixed, sidebar-aware bar at the bottom of a challenge board, so its actions
 * stay reachable without scrolling past a long roster. Render it outside any
 * ancestor with a backdrop filter or transform, which would trap the fixed
 * positioning. The board itself should keep bottom padding so nothing hides
 * behind the bar. */
export const StreakActionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed left-[var(--sidebar-width,0rem)] right-0 bottom-0 z-30 border-t border-border-color bg-bg-surface/95 shadow-2xl backdrop-blur-md transition-[left] duration-300">
    <div className="flex items-center justify-center gap-3 px-5 sm:px-7 lg:px-9 py-2.5">{children}</div>
  </div>
);

const VARIANT_CLASSES = {
  green: 'bg-accent-green hover:bg-accent-green-hover',
  red: 'bg-accent-red hover:bg-accent-red-hover',
} as const;

interface StreakActionButtonProps {
  variant: keyof typeof VARIANT_CLASSES;
  onClick: () => void;
  disabled?: boolean;
  /** Smaller padding/text for boards that are already tight on vertical space. */
  compact?: boolean;
  children: React.ReactNode;
}

export const StreakActionButton: React.FC<StreakActionButtonProps> = ({
  variant,
  onClick,
  disabled,
  compact = false,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 ${VARIANT_CLASSES[variant]} disabled:opacity-50 text-text-inverted font-extrabold rounded-xl shadow-xs transition-all cursor-pointer ${
      compact ? 'max-w-[180px] text-sm py-2.5 px-5' : 'max-w-xs text-base py-3.5 px-6'
    }`}
  >
    {children}
  </button>
);
