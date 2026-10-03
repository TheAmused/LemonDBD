'use client';
// frontend/src/components/streaks/StreakActionBar.tsx

import { Button } from '@/components/common/Button';
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

const BUTTON_VARIANT = { green: 'success', red: 'primary' } as const;

interface StreakActionButtonProps {
  variant: keyof typeof BUTTON_VARIANT;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const StreakActionButton: React.FC<StreakActionButtonProps> = ({
  variant,
  onClick,
  disabled,
  children,
}) => (
  <Button
    variant={BUTTON_VARIANT[variant]}
    size="md"
    onClick={onClick}
    disabled={disabled}
    className="flex-1 max-w-[180px]"
  >
    {children}
  </Button>
);
