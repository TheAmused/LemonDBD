// frontend/src/components/common/Switch.tsx
'use client';
import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  className?: string;
  size?: SwitchSize;
}

export type SwitchSize = 'sm' | 'md';

const TRACK_SIZE: Record<SwitchSize, string> = {
  md: 'h-6 w-11',
  sm: 'h-3.5 w-6 sm:h-5 sm:w-9',
};
const THUMB_SIZE: Record<SwitchSize, string> = {
  md: 'h-4 w-4',
  sm: 'h-2.5 w-2.5 sm:h-3.5 sm:w-3.5',
};
const THUMB_ON: Record<SwitchSize, string> = {
  md: 'translate-x-6',
  sm: 'translate-x-2.5 sm:translate-x-4',
};
const THUMB_OFF: Record<SwitchSize, string> = {
  md: 'translate-x-1',
  sm: 'translate-x-0.5',
};

/**
 * Presentational track + thumb. Use it directly only when the switch must sit
 * inside a larger clickable element (a button can't be nested in a button);
 * that parent then carries role="switch" itself.
 */
export const SwitchTrack: React.FC<{ checked: boolean; size?: SwitchSize; className?: string }> = ({
  checked,
  size = 'md',
  className = '',
}) => (
  <span
    aria-hidden="true"
    className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${TRACK_SIZE[size]} ${
      checked ? 'bg-accent-green' : 'bg-bg-elevated border border-border-color'
    } ${className}`}
  >
    <span
      className={`inline-block transform rounded-full bg-text-inverted shadow transition-transform ${THUMB_SIZE[size]} ${
        checked ? THUMB_ON[size] : THUMB_OFF[size]
      }`}
    />
  </span>
);

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, ariaLabel, className = '', size = 'md' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`inline-flex shrink-0 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red ${className}`}
    >
      <SwitchTrack checked={checked} size={size} />
    </button>
  );
};

export default Switch;
