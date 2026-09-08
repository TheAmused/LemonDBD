// frontend/src/components/user/VaultMasteryDials.tsx
'use client';

import React from 'react';
import { Shield, Skull, Sparkles } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

interface MetricItem {
  owned: number;
  total: number;
  percentage: number;
}

interface OwnershipData {
  survivors?: MetricItem;
  killers?: MetricItem;
  perks?: {
    unlocked: number;
    total: number;
    percentage: number;
  };
}

interface VaultMasteryDialsProps {
  ownership?: OwnershipData | null;
  dict?: Dictionary | null;
  compact?: boolean;
  hideTitle?: boolean;
  className?: string;
}

interface DialProps {
  title: string;
  count: number;
  total: number;
  percentage: number;
  colorHex: string;
  accentClass: string;
  icon: React.ReactNode;
  compact?: boolean;
}

const RadialDial: React.FC<DialProps> = ({
  title,
  count,
  total,
  percentage,
  colorHex,
  accentClass,
  icon,
  compact = false,
}) => {
  const radius = compact ? 30 : 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  const viewBoxSize = compact ? 76 : 96;
  const center = viewBoxSize / 2;

  return (
    <div
      className={`relative flex flex-col items-center border border-border-color bg-bg-surface backdrop-blur-md shadow-xs transition-all hover:border-accent-amber/40 group ${
        compact
          ? 'rounded-2xl p-3 sm:p-3.5 min-w-[100px] sm:min-w-[115px]'
          : 'rounded-3xl p-5 sm:p-6 shadow-md'
      }`}
    >
      {/* Radial Gauge SVG */}
      <div className="relative flex items-center justify-center">
        <svg
          className={`${compact ? 'w-20 h-20' : 'w-28 h-28'} -rotate-90 transform`}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        >
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="var(--bg-elevated)"
            strokeWidth={compact ? '5' : '7'}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colorHex}
            strokeWidth={compact ? '5' : '7'}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`${
              compact ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'
            } font-black font-mono tracking-tight text-text-primary`}
          >
            {percentage}%
          </div>
          <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-mono text-text-muted`}>
            {count}/{total}
          </div>
        </div>
      </div>

      {/* Title & Icon below */}
      <div className={`flex items-center gap-1.5 ${compact ? 'mt-2' : 'mt-4'}`}>
        <div className={`rounded-lg ${compact ? 'p-1' : 'p-1.5'} ${accentClass}`}>
          {icon}
        </div>
        <span
          className={`${
            compact ? 'text-[10px]' : 'text-xs'
          } font-black font-mono uppercase tracking-wider text-text-primary`}
        >
          {title}
        </span>
      </div>
    </div>
  );
};

export const VaultMasteryDials: React.FC<VaultMasteryDialsProps> = ({
  ownership,
  dict,
  compact = false,
  hideTitle = false,
  className = '',
}) => {
  const survOwned = ownership?.survivors?.owned ?? 0;
  const survTotal = ownership?.survivors?.total ?? 54;
  const survPercent =
    ownership?.survivors?.percentage ??
    (survTotal > 0 ? Math.round((survOwned / survTotal) * 100) : 0);

  const killerOwned = ownership?.killers?.owned ?? 0;
  const killerTotal = ownership?.killers?.total ?? 44;
  const killerPercent =
    ownership?.killers?.percentage ??
    (killerTotal > 0 ? Math.round((killerOwned / killerTotal) * 100) : 0);

  const perkUnlocked = ownership?.perks?.unlocked ?? 0;
  const perkTotal = ownership?.perks?.total ?? 321;
  const perkPercent =
    ownership?.perks?.percentage ??
    (perkTotal > 0 ? Math.round((perkUnlocked / perkTotal) * 100) : 0);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {!hideTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-black font-mono uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-amber" />
            <span>{dict?.user?.vaultMastery || 'Vault Mastery'}</span>
          </h2>
        </div>
      )}

      <div className={`grid ${compact ? 'grid-cols-3 gap-2.5 sm:gap-3' : 'grid-cols-1 sm:grid-cols-3 gap-4'}`}>
        {/* Survivors Dial */}
        <RadialDial
          title={dict?.stats?.survivors || 'Survivors'}
          count={survOwned}
          total={survTotal}
          percentage={survPercent}
          colorHex="#06b6d4" // Cyan-500
          accentClass="bg-cyan-500/15 text-cyan-500 dark:text-cyan-400"
          icon={<Shield className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
          compact={compact}
        />

        {/* Killers Dial */}
        <RadialDial
          title={dict?.stats?.killers || 'Killers'}
          count={killerOwned}
          total={killerTotal}
          percentage={killerPercent}
          colorHex="#ef4444" // Red-500
          accentClass="bg-accent-red/15 text-accent-red"
          icon={<Skull className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
          compact={compact}
        />

        {/* Perks Dial */}
        <RadialDial
          title={dict?.sidebar?.perks || 'Perks'}
          count={perkUnlocked}
          total={perkTotal}
          percentage={perkPercent}
          colorHex="#f59e0b" // Amber-500
          accentClass="bg-accent-amber/15 text-accent-amber"
          icon={<Sparkles className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
          compact={compact}
        />
      </div>
    </div>
  );
};
