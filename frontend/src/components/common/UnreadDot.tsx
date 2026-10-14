// frontend/src/components/common/UnreadDot.tsx
import React from 'react';

interface UnreadDotProps {
  /** Positioning from the caller, e.g. `absolute -right-0.5 -top-0.5` or `relative`. */
  className?: string;
  /** Spoken name for the dot; without it the dot is decorative and hidden from assistive tech. */
  label?: string;
}

/** Small pulsing red dot that marks something new, the same one the What's New button uses. */
export const UnreadDot: React.FC<UnreadDotProps> = ({ className = '', label }) => (
  <span
    className={`flex h-2.5 w-2.5 ${className}`}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-red opacity-75" />
    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-red ring-2 ring-bg-surface" />
  </span>
);
