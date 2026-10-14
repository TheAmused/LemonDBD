// frontend/src/components/common/UnreadDot.tsx
import React from 'react';

interface UnreadDotProps {
  className?: string;
  label?: string;
}

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
