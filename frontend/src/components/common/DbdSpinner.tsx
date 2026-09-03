'use client';
// frontend/src/components/common/DbdSpinner.tsx

import React from 'react';
import { LemonIcon } from '@/components/LemonIcon';
import type { Dictionary } from '@/locales/types';

export type DbdSpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'responsive' | number;
export type DbdSpinnerLayout = 'fullscreen' | 'page' | 'card' | 'inline' | 'compact';
export type DbdSpinnerAccent =
  | 'crimson'
  | 'amber'
  | 'emerald'
  | 'cyan'
  | 'violet'
  | 'blood'
  | 'gold'
  | 'neon';

export interface DbdSpinnerCustomColors {
  greatZone?: string;
  needle?: string;
  glow?: string;
  ring?: string;
  text?: string;
  baseTrack?: string;
}

export interface DbdSpinnerProps {
  size?: DbdSpinnerSize;
  layout?: DbdSpinnerLayout;
  label?: string;
  sublabel?: string;
  accent?: DbdSpinnerAccent;
  customColors?: DbdSpinnerCustomColors;
  dict?: Dictionary | any;
  className?: string;
  needleSpeed?: number;
  showEmblem?: boolean;
  ariaLabel?: string;
  minHeight?: string | number;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', number> = {
  xs: 48,
  sm: 80,
  md: 150,
  lg: 220,
  xl: 280,
  '2xl': 360,
};

export const DbdSpinner: React.FC<DbdSpinnerProps> = ({
  size = 'md',
  layout = 'inline',
  label,
  sublabel,
  accent = 'crimson',
  customColors,
  dict,
  className = '',
  needleSpeed = 1.3,
  showEmblem = true,
  ariaLabel,
  minHeight,
}) => {
  let dimension: number = 150;
  let isResponsive = false;

  if (typeof size === 'number') {
    dimension = size;
  } else if (size === 'responsive') {
    isResponsive = true;
    dimension = 280;
  } else {
    dimension = SIZE_MAP[size] || SIZE_MAP.md;
  }

  const resolvedLabel =
    label ||
    ariaLabel ||
    dict?.app?.loading ||
    dict?.characterDetail?.loading ||
    dict?.perks?.loading ||
    dict?.admin?.loading;

  const basePalettes: Record<DbdSpinnerAccent, DbdSpinnerCustomColors> = {
    crimson: {
      greatZone: '#ef4444',
      needle: '#f43f5e',
      glow: 'rgba(239, 68, 68, 0.75)',
      ring: 'rgba(244, 63, 94, 0.35)',
      text: 'text-rose-600 dark:text-rose-400',
      baseTrack: '#1e293b',
    },
    amber: {
      greatZone: '#f59e0b',
      needle: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.75)',
      ring: 'rgba(251, 191, 36, 0.35)',
      text: 'text-accent-amber',
      baseTrack: '#1e293b',
    },
    emerald: {
      greatZone: '#10b981',
      needle: '#34d399',
      glow: 'rgba(16, 185, 129, 0.75)',
      ring: 'rgba(52, 211, 153, 0.35)',
      text: 'text-emerald-700 dark:text-emerald-400',
      baseTrack: '#1e293b',
    },
    cyan: {
      greatZone: '#06b6d4',
      needle: '#38bdf8',
      glow: 'rgba(6, 182, 212, 0.75)',
      ring: 'rgba(56, 189, 248, 0.35)',
      text: 'text-cyan-700 dark:text-cyan-400',
      baseTrack: '#1e293b',
    },
    violet: {
      greatZone: '#8b5cf6',
      needle: '#a78bfa',
      glow: 'rgba(139, 92, 246, 0.75)',
      ring: 'rgba(167, 139, 250, 0.35)',
      text: 'text-purple-700 dark:text-purple-400',
      baseTrack: '#1e293b',
    },
    blood: {
      greatZone: '#dc2626',
      needle: '#991b1b',
      glow: 'rgba(220, 38, 38, 0.90)',
      ring: 'rgba(153, 27, 27, 0.40)',
      text: 'text-red-700 dark:text-red-500',
      baseTrack: '#170202',
    },
    gold: {
      greatZone: '#f59e0b',
      needle: '#fde047',
      glow: 'rgba(245, 158, 11, 0.85)',
      ring: 'rgba(253, 224, 71, 0.40)',
      text: 'text-accent-amber',
      baseTrack: '#1e293b',
    },
    neon: {
      greatZone: '#00ffcc',
      needle: '#ff007f',
      glow: 'rgba(0, 255, 204, 0.85)',
      ring: 'rgba(255, 0, 127, 0.40)',
      text: 'text-cyan-700 dark:text-cyan-300',
      baseTrack: '#051b2c',
    },
  };

  const selectedPalette = basePalettes[accent] || basePalettes.crimson;

  const colorMap = {
    greatZone: customColors?.greatZone || selectedPalette.greatZone,
    needle: customColors?.needle || selectedPalette.needle,
    glow: customColors?.glow || selectedPalette.glow,
    ring: customColors?.ring || selectedPalette.ring,
    text: customColors?.text || selectedPalette.text,
    baseTrack: customColors?.baseTrack || selectedPalette.baseTrack,
  };

  const layoutClasses = {
    fullscreen:
      'fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/95 backdrop-blur-md dbd-fog-overlay p-6',
    page:
      'w-full min-h-[60vh] flex-1 flex flex-col items-center justify-center p-6 dbd-fog-overlay',
    card:
      'w-full min-h-[260px] flex flex-col items-center justify-center p-6 rounded-3xl bg-bg-surface border border-border-color shadow-2xl',
    inline:
      'w-full py-10 flex flex-col items-center justify-center',
    compact:
      'inline-flex flex-col items-center justify-center',
  }[layout];

  const uniqueId = React.useId().replace(/:/g, '');
  const filterId = `dbd-spinner-glow-${uniqueId}`;
  const emblemSize = Math.max(20, Math.round(dimension * 0.31));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={resolvedLabel}
      className={`select-none text-text-primary ${layoutClasses} ${className}`}
      style={minHeight ? { minHeight } : undefined}
    >
      <div
        className={`relative flex items-center justify-center ${
          isResponsive
            ? 'w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96'
            : ''
        }`}
        style={
          isResponsive
            ? undefined
            : { width: dimension, height: dimension }
        }
      >
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id={`needleGrad-${uniqueId}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="70%" stopColor={colorMap.needle} stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>

            <radialGradient id={`hubGrad-${uniqueId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0b0f19" />
              <stop offset="100%" stopColor="#030712" />
            </radialGradient>
          </defs>

          <circle
            cx="80"
            cy="80"
            r="76"
            fill="none"
            stroke={colorMap.ring}
            strokeWidth="1.8"
            strokeDasharray="4 8"
            opacity="0.75"
          />

          <g className="dbd-spinner-runes">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="1 11"
              className="text-text-muted"
            />
            <line x1="80" y1="6" x2="80" y2="12" stroke="currentColor" strokeWidth="2" className="text-text-secondary" />
            <line x1="80" y1="148" x2="80" y2="154" stroke="currentColor" strokeWidth="2" className="text-text-secondary" />
            <line x1="6" y1="80" x2="12" y2="80" stroke="currentColor" strokeWidth="2" className="text-text-secondary" />
            <line x1="148" y1="80" x2="154" y2="80" stroke="currentColor" strokeWidth="2" className="text-text-secondary" />
          </g>

          <circle
            cx="80"
            cy="80"
            r="58"
            fill="none"
            stroke={colorMap.baseTrack}
            strokeWidth="7.5"
            strokeLinecap="round"
            className="stroke-border-color dark:stroke-slate-800"
          />

          <circle
            cx="80"
            cy="80"
            r="58"
            fill="none"
            stroke="currentColor"
            strokeWidth="7.5"
            strokeDasharray="66 298"
            strokeDashoffset="-210"
            strokeLinecap="round"
            className="text-slate-400 dark:text-slate-200 opacity-95"
          />

          <circle
            cx="80"
            cy="80"
            r="58"
            fill="none"
            stroke={colorMap.greatZone}
            strokeWidth="8.5"
            strokeDasharray="16 348"
            strokeDashoffset="-260"
            strokeLinecap="round"
            filter={`url(#${filterId})`}
          />

          <circle
            cx="80"
            cy="80"
            r="38"
            fill={`url(#hubGrad-${uniqueId})`}
            stroke="#334155"
            strokeWidth="2.5"
            className="shadow-2xl"
          />

          <g
            className="dbd-spinner-needle"
            style={{ '--dbd-needle-speed': `${needleSpeed}s` } as React.CSSProperties}
          >
            <path
              d="M 80 80 L 80 18"
              stroke={`url(#needleGrad-${uniqueId})`}
              strokeWidth="4.0"
              strokeLinecap="round"
              filter={`url(#${filterId})`}
            />
            <polygon
              points="80,12 85,24 75,24"
              fill={colorMap.needle}
              filter={`url(#${filterId})`}
            />
            <circle cx="80" cy="80" r="6" fill={colorMap.needle} />
          </g>
        </svg>

        {showEmblem && (
          <div
            className="dbd-spinner-emblem absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ filter: `drop-shadow(0 0 10px ${colorMap.glow})` }}
          >
            <LemonIcon size={emblemSize} />
          </div>
        )}
      </div>

      {(label || sublabel || (layout !== 'compact' && resolvedLabel)) && (
        <div className="mt-5 flex flex-col items-center text-center space-y-1.5 max-w-sm sm:max-w-md px-2">
          {resolvedLabel && (
            <p
              className={`dbd-spinner-label text-base sm:text-lg font-black font-mono tracking-wider uppercase ${colorMap.text} drop-shadow-xs`}
            >
              {resolvedLabel}
            </p>
          )}

          {sublabel && (
            <p className="text-xs sm:text-sm text-text-secondary font-medium drop-shadow-xs">
              {sublabel}
            </p>
          )}
        </div>
      )}

      {resolvedLabel && <span className="sr-only">{resolvedLabel}</span>}
    </div>
  );
};

export default DbdSpinner;

