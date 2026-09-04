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
    <div className="relative flex flex-col items-center rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-md transition-all hover:border-slate-300 dark:hover:border-slate-700">
      {/* Radial Gauge SVG */}
      <div className="relative flex items-center justify-center">
        <svg className="w-28 h-28 -rotate-90 transform" viewBox="0 0 96 96">
          {/* Background circle track */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-800"
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
          <div className="text-base sm:text-lg font-black font-mono tracking-tight text-slate-900 dark:text-slate-100">
            {percentage}%
          </div>
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            {count}/{total}
          </div>
        </div>
      </div>

      {/* Title & Icon below */}
      <div className="flex items-center gap-1.5 mt-3">
        <div className={`p-1 rounded-lg ${accentClass}`}>
          {icon}
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
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
          accentClass="bg-cyan-500/10 text-cyan-500 dark:text-cyan-400"
          icon={<Shield className="h-3.5 w-3.5" />}
        />

        {/* Killers Dial */}
        <RadialDial
          title={dict?.stats?.killers || 'Killers'}
          count={killerOwned}
          total={killerTotal}
          percentage={killerPercent}
          colorHex="#ef4444" // Red-500
          accentClass="bg-red-500/10 text-red-500 dark:text-red-400"
          icon={<Skull className="h-3.5 w-3.5" />}
        />

        {/* Perks Dial */}
        <RadialDial
          title={dict?.sidebar?.perks || 'Perks'}
          count={perkUnlocked}
          total={perkTotal}
          percentage={perkPercent}
          colorHex="#f59e0b" // Amber-500
          accentClass="bg-amber-500/10 text-amber-500 dark:text-amber-400"
          icon={<Sparkles className="h-3.5 w-3.5" />}
        />
      </div>
    </div>
  );
};
