'use client';
// frontend/src/components/DisabledBadge.tsx

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DisabledBadgeProps {
  /** Name of the disabled thing, used for the accessible label. */
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Tailwind position classes, e.g. "top-2 left-2". Defaults to top-right. */
  position?: string;
}

/** Corner badge marking a perk/killer as admin-disabled. Click opens a modal
 * with the reason (owned by the parent) -- deliberately never grayscaled
 * along with the disabled artwork it sits on. */
export const DisabledBadge: React.FC<DisabledBadgeProps> = ({ label, onClick, position = 'top-1 right-1' }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    aria-label={`Why is ${label} disabled?`}
    className={`absolute ${position} z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/90 shadow-md border border-amber-500/50 cursor-pointer hover:bg-slate-900 transition-colors`}
  >
    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
  </button>
);
