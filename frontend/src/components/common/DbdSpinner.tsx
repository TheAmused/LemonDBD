'use client';
// frontend/src/components/common/DbdSpinner.tsx

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  /** Size variant or explicit pixel dimension */
  size?: DbdSpinnerSize;
  /** Layout mode for positioning and backdrop */
  layout?: DbdSpinnerLayout;
  /** Primary loading label text */
  label?: string;
  /** Secondary subtitle / hint text */
  sublabel?: string;
  /** Accent color scheme */
  accent?: DbdSpinnerAccent;
  /** Custom color overrides for ultimate page uniqueness */
  customColors?: DbdSpinnerCustomColors;
  /** Optional Dictionary object for automatic localized fallback */
  dict?: Dictionary | any;
  /** Additional container CSS classes */
  className?: string;
  /** Speed multiplier for the sweeping needle in seconds (default: 1.3) */
  needleSpeed?: number;
  /** Whether to show the central LemonDBD emblem (default: true) */
  showEmblem?: boolean;
  /** Custom accessible ARIA label override */
  ariaLabel?: string;
  /** Explicit min-height style (e.g. '300px', '100%') */
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

/**
 * Universal Dead by Daylight Skill Check Framer Motion Loading Spinner & Skeleton.
 * Single dynamic source of truth for all loading states across the frontend.
 */
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
  const shouldReduceMotion = useReducedMotion();

  // Resolve numerical or responsive dimension
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

  // Resolve default localized text if none provided
  const resolvedLabel =
    label ||
    ariaLabel ||
    dict?.app?.loading ||
    dict?.characterDetail?.loading ||
    dict?.perks?.loading ||
    'Loading...';

  // Accent theme color palettes
  const basePalettes: Record<DbdSpinnerAccent, DbdSpinnerCustomColors> = {
    crimson: {
      greatZone: '#ef4444',
      needle: '#f43f5e',
      glow: 'rgba(239, 68, 68, 0.75)',
      ring: 'rgba(244, 63, 94, 0.35)',
      text: 'text-rose-400',
      baseTrack: '#1e293b',
    },
    amber: {
      greatZone: '#f59e0b',
      needle: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.75)',
      ring: 'rgba(251, 191, 36, 0.35)',
      text: 'text-amber-400',
      baseTrack: '#1e293b',
    },
    emerald: {
      greatZone: '#10b981',
      needle: '#34d399',
      glow: 'rgba(16, 185, 129, 0.75)',
      ring: 'rgba(52, 211, 153, 0.35)',
      text: 'text-emerald-400',
      baseTrack: '#1e293b',
    },
    cyan: {
      greatZone: '#06b6d4',
      needle: '#38bdf8',
      glow: 'rgba(6, 182, 212, 0.75)',
      ring: 'rgba(56, 189, 248, 0.35)',
      text: 'text-cyan-400',
      baseTrack: '#1e293b',
    },
    violet: {
      greatZone: '#8b5cf6',
      needle: '#a78bfa',
      glow: 'rgba(139, 92, 246, 0.75)',
      ring: 'rgba(167, 139, 250, 0.35)',
      text: 'text-purple-400',
      baseTrack: '#1e293b',
    },
    blood: {
      greatZone: '#dc2626',
      needle: '#991b1b',
      glow: 'rgba(220, 38, 38, 0.90)',
      ring: 'rgba(153, 27, 27, 0.40)',
      text: 'text-red-500',
      baseTrack: '#170202',
    },
    gold: {
      greatZone: '#f59e0b',
      needle: '#fde047',
      glow: 'rgba(245, 158, 11, 0.85)',
      ring: 'rgba(253, 224, 71, 0.40)',
      text: 'text-yellow-400',
      baseTrack: '#1e293b',
    },
    neon: {
      greatZone: '#00ffcc',
      needle: '#ff007f',
      glow: 'rgba(0, 255, 204, 0.85)',
      ring: 'rgba(255, 0, 127, 0.40)',
      text: 'text-cyan-300',
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

  // Layout wrapper classes
  const layoutClasses = {
    fullscreen:
      'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b12]/95 backdrop-blur-md dbd-fog-overlay p-6',
    page:
      'w-full min-h-[60vh] flex-1 flex flex-col items-center justify-center p-6 dbd-fog-overlay',
    card:
      'w-full min-h-[260px] flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-950/60 border border-slate-800/80 shadow-2xl',
    inline:
      'w-full py-10 flex flex-col items-center justify-center',
    compact:
      'inline-flex flex-col items-center justify-center',
  }[layout];

  const uniqueId = React.useId().replace(/:/g, '');
  const filterId = `dbd-spinner-glow-${uniqueId}`;

  // Emblem scale based on dial dimension
  const emblemSize = Math.max(20, Math.round(dimension * 0.31));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={resolvedLabel}
      className={`select-none text-slate-100 ${layoutClasses} ${className}`}
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
        {/* SVG Skill Check Dial */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            {/* High-intensity Great Skill Check Glow Filter */}
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

          {/* 1. Atmospheric Ambient Outer Fog Ring */}
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

          {/* 2. Counter-Rotating Outer Rune Ring */}
          <motion.g
            animate={
              shouldReduceMotion
                ? { opacity: [0.4, 0.8, 0.4] }
                : { rotate: -360 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 14, repeat: Infinity, ease: 'linear' }
            }
            style={{ transformOrigin: '80px 80px' }}
          >
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="1 11"
              className="text-slate-500/70"
            />
            <line x1="80" y1="6" x2="80" y2="12" stroke="currentColor" strokeWidth="2" className="text-slate-400" />
            <line x1="80" y1="148" x2="80" y2="154" stroke="currentColor" strokeWidth="2" className="text-slate-400" />
            <line x1="6" y1="80" x2="12" y2="80" stroke="currentColor" strokeWidth="2" className="text-slate-400" />
            <line x1="148" y1="80" x2="154" y2="80" stroke="currentColor" strokeWidth="2" className="text-slate-400" />
          </motion.g>

          {/* 3. Base Skill Check Track */}
          <circle
            cx="80"
            cy="80"
            r="58"
            fill="none"
            stroke={colorMap.baseTrack}
            strokeWidth="7.5"
            strokeLinecap="round"
            className="dark:stroke-slate-800"
          />

          {/* 4. Good Success Zone Arc (White/Silver Zone ~65°) */}
          <circle
            cx="80"
            cy="80"
            r="58"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="7.5"
            strokeDasharray="66 298"
            strokeDashoffset="-210"
            strokeLinecap="round"
            className="opacity-95"
          />

          {/* 5. Great Skill Check Zone Arc (Glowing Crimson/Amber Zone ~16°) */}
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

          {/* 6. Central Hub Disc */}
          <circle
            cx="80"
            cy="80"
            r="38"
            fill={`url(#hubGrad-${uniqueId})`}
            stroke="#334155"
            strokeWidth="2.5"
            className="shadow-2xl"
          />

          {/* 7. Sweeping Skill Check Needle */}
          <motion.g
            animate={
              shouldReduceMotion
                ? { opacity: [0.6, 1, 0.6] }
                : { rotate: 360 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: needleSpeed, repeat: Infinity, ease: 'linear' }
            }
            style={{ transformOrigin: '80px 80px' }}
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
          </motion.g>
        </svg>

        {/* 8. Pulsing Central Entity Emblem / LemonDBD Logo */}
        {showEmblem && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={
              shouldReduceMotion
                ? { opacity: [0.85, 1, 0.85] }
                : {
                    scale: [0.92, 1.09, 0.92],
                    filter: [
                      `drop-shadow(0 0 3px ${colorMap.glow})`,
                      `drop-shadow(0 0 16px ${colorMap.glow})`,
                      `drop-shadow(0 0 3px ${colorMap.glow})`,
                    ],
                  }
            }
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <LemonIcon size={emblemSize} className="filter drop-shadow-lg" />
          </motion.div>
        )}
      </div>

      {/* 9. Optional Localized Label & Sublabel */}
      {(label || sublabel || (layout !== 'compact' && resolvedLabel)) && (
        <div className="mt-5 flex flex-col items-center text-center space-y-1.5 max-w-sm sm:max-w-md px-2">
          {resolvedLabel && (
            <motion.p
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className={`text-base sm:text-lg font-black font-mono tracking-wider uppercase ${colorMap.text} drop-shadow-md`}
            >
              {resolvedLabel}
            </motion.p>
          )}

          {sublabel && (
            <p className="text-xs sm:text-sm text-slate-300/80 font-medium drop-shadow-sm">
              {sublabel}
            </p>
          )}
        </div>
      )}

      {/* Screen Reader Announcement */}
      <span className="sr-only">{resolvedLabel}</span>
    </div>
  );
};

export default DbdSpinner;
