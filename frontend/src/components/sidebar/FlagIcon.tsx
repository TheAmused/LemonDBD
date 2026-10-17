// frontend/src/components/sidebar/FlagIcon.tsx
'use client';

import React from 'react';

export interface FlagIconProps {
  code: string;
  className?: string;
}

const GB: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="15" className="fill-flag-gb-blue" />
    <path d="M0 0L20 15M20 0L0 15" className="stroke-flag-white" strokeWidth="3" />
    <path d="M0 0L20 15M20 0L0 15" className="stroke-flag-gb-red" strokeWidth="1" />
    <path d="M10 0V15M0 7.5H20" className="stroke-flag-white" strokeWidth="5" />
    <path d="M10 0V15M0 7.5H20" className="stroke-flag-gb-red" strokeWidth="3" />
  </svg>
);

const PL: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="7.5" y="0" className="fill-flag-white" />
    <rect width="20" height="7.5" y="7.5" className="fill-flag-pl-red" />
  </svg>
);

const ES: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="15" className="fill-flag-es-red" />
    <rect width="20" height="7.5" y="3.75" className="fill-flag-es-yellow" />
  </svg>
);

const DE: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="5" y="0" className="fill-flag-black" />
    <rect width="20" height="5" y="5" className="fill-flag-de-red" />
    <rect width="20" height="5" y="10" className="fill-flag-de-gold" />
  </svg>
);

const JP: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 15" className={className} aria-hidden="true">
    <rect width="20" height="15" className="fill-flag-white" />
    <circle cx="10" cy="7.5" r="4.2" className="fill-flag-jp-red" />
  </svg>
);

const FLAGS: Record<string, React.FC<{ className?: string }>> = { en: GB, pl: PL, es: ES, de: DE, ja: JP };

export const FlagIcon: React.FC<FlagIconProps> = ({ code, className = 'h-3.5 w-5 rounded-chip' }) => {
  const Flag = FLAGS[code] ?? GB;
  return <Flag className={className} />;
};
