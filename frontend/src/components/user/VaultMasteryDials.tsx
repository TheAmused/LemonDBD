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
}

interface DialProps {
  title: string;
  count: number;
  total: number;
  percentage: number;
  colorHex: string;
  accentClass: string;
  icon: React.ReactNode;
}

const RadialDial: React.FC<DialProps> = ({
  title,
  count,
  total,
  percentage,
  colorHex,
  accentClass,
  icon,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center rounded-3xl border border-border-color bg-bg-surface p-5 sm:p-6 backdrop-blur-md shadow-md transition-all hover:border-border-color/80 group">
      {/* Radial Gauge SVG */}
      <div className="relative flex items-center justify-center">
        <svg className="w-28 h-28 -rotate-90 transform" viewBox="0 0 96 96">
          {/* Background circle track */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="var(--bg-elevated)"
            strokeWidth="7"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={colorHex}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-text-primary">
            {percentage}%
          </div>
          <div className="text-xs font-mono text-text-muted">
            {count}/{total}
          </div>
        </div>
      </div>

      {/* Title & Icon below */}
      <div className="flex items-center gap-2 mt-4">
        <div className={`p-1.5 rounded-xl ${accentClass}`}>
          {icon}
        </div>
        <span className="text-xs font-black font-mono uppercase tracking-wider text-text-primary">
          {title}
        </span>
      </div>
    </div>
  );
};

export const VaultMasteryDials: React.FC<VaultMasteryDialsProps> = ({ ownership, dict }) => {
  const survOwned = ownership?.survivors?.owned ?? 0;
  const survTotal = ownership?.survivors?.total ?? 54;
  const survPercent = ownership?.survivors?.percentage ?? 0;

  const killerOwned = ownership?.killers?.owned ?? 0;
  const killerTotal = ownership?.killers?.total ?? 44;
  const killerPercent = ownership?.killers?.percentage ?? 0;

  const perkUnlocked = ownership?.perks?.unlocked ?? 0;
  const perkTotal = ownership?.perks?.total ?? 321;
  const perkPercent = ownership?.perks?.percentage ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black font-mono uppercase tracking-wider text-text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-amber" />
          <span>{dict?.user?.vaultMastery || 'Vault Mastery'}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Survivors Dial */}
        <RadialDial
          title={dict?.stats?.survivors || 'Survivors'}
          count={survOwned}
          total={survTotal}
          percentage={survPercent}
          colorHex="#06b6d4" // Cyan-500
          accentClass="bg-cyan-500/15 text-cyan-500 dark:text-cyan-400"
          icon={<Shield className="h-3.5 w-3.5" />}
        />

        {/* Killers Dial */}
        <RadialDial
          title={dict?.stats?.killers || 'Killers'}
          count={killerOwned}
          total={killerTotal}
          percentage={killerPercent}
          colorHex="#ef4444" // Red-500
          accentClass="bg-accent-red/15 text-accent-red"
          icon={<Skull className="h-3.5 w-3.5" />}
        />

        {/* Perks Dial */}
        <RadialDial
          title={dict?.sidebar?.perks || 'Perks'}
          count={perkUnlocked}
          total={perkTotal}
          percentage={perkPercent}
          colorHex="#f59e0b" // Amber-500
          accentClass="bg-accent-amber/15 text-accent-amber"
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
};
