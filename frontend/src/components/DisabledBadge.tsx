'use client';
// frontend/src/components/DisabledBadge.tsx

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DisabledBadgeProps {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  position?: string;
  ariaLabel?: string;
}

export const DisabledBadge: React.FC<DisabledBadgeProps> = ({
  label,
  onClick,
  position = 'top-1 right-1',
  ariaLabel,
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    aria-label={ariaLabel || label}
    className={`absolute ${position} z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-surface/90 shadow-xs border border-accent-amber text-accent-amber cursor-pointer hover:bg-bg-elevated transition-colors`}
  >
    <AlertTriangle className="h-3.5 w-3.5" />
  </button>
);

