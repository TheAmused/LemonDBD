// frontend/src/components/sidebar/FlagIcon.tsx
'use client';

import React from 'react';

export interface FlagIconProps {
  code: string;
  className?: string;
}

const GB: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="15" fill="#00247d" />
    <path d="M0 0L20 15M20 0L0 15" stroke="#fff" strokeWidth="3" />
    <path d="M0 0L20 15M20 0L0 15" stroke="#cf142b" strokeWidth="1" />
    <path d="M10 0V15M0 7.5H20" stroke="#fff" strokeWidth="5" />
    <path d="M10 0V15M0 7.5H20" stroke="#cf142b" strokeWidth="3" />
  </svg>
);

const PL: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="7.5" y="0" fill="#fff" />
    <rect width="20" height="7.5" y="7.5" fill="#dc143c" />
  </svg>
);

const ES: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="15" fill="#aa151b" />
    <rect width="20" height="7.5" y="3.75" fill="#f1bf00" />
  </svg>
);

const DE: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="5" y="0" fill="#000" />
    <rect width="20" height="5" y="5" fill="#dd0000" />
    <rect width="20" height="5" y="10" fill="#ffce00" />
  </svg>
);

const JP: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="15" fill="#fff" />
    <circle cx="10" cy="7.5" r="4.2" fill="#bc002d" />
  </svg>
);

const FLAGS: Record<string, React.FC<{ className?: string }>> = { en: GB, pl: PL, es: ES, de: DE, ja: JP };

export const FlagIcon: React.FC<FlagIconProps> = ({ code, className = 'h-3.5 w-5 rounded-sm' }) => {
  const Flag = FLAGS[code] ?? GB;
  return <Flag className={className} />;
};
