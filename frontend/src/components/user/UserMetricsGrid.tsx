'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/user/UserMetricsGrid.tsx

import React from 'react';
import { Shield, Skull, Sparkles } from 'lucide-react';
import { DbdSpinner } from '@/components/DbdSpinner';

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

interface UserMetricsGridProps {
  ownership?: OwnershipData | null;
  dict?: Dictionary;
}

/** DBD Skill Check Framer Motion Loading Spinner for metric cards. */
export const UserMetricsGridSkeleton: React.FC<{ className?: string; dict?: Dictionary | null }> = ({ className = '', dict }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label={dict?.characterDetail?.loading || dict?.app?.loading || undefined}
    className={`w-full min-h-[120px] flex items-center justify-center p-4 rounded-2xl border border-border-color bg-bg-surface ${className}`}
  >
    <DbdSpinner size="sm" layout="inline" accent="blood" dict={dict} />
  </div>
);

export const UserMetricsGrid: React.FC<UserMetricsGridProps> = ({ ownership, dict }) => {
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 w-full">
      {/* Survivors Metric Card */}
      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 sm:p-5 backdrop-blur-xl shadow-sm dark:shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                {dict?.stats?.survivors || 'Survivors'}
              </h3>
              <p className="text-sm sm:text-base font-black text-text-primary font-mono">
                {survOwned} / {survTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-accent-green font-mono">
            {survPercent}{'%'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full bg-accent-green transition-all duration-500"
            style={{ width: `${survPercent}%` }}
          />
        </div>
      </div>

      {/* Killers Metric Card */}
      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 sm:p-5 backdrop-blur-xl shadow-sm dark:shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red">
              <Skull className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                {dict?.stats?.killers || 'Killers'}
              </h3>
              <p className="text-sm sm:text-base font-black text-text-primary font-mono">
                {killerOwned} / {killerTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-accent-red font-mono">
            {killerPercent}{'%'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full bg-accent-red transition-all duration-500"
            style={{ width: `${killerPercent}%` }}
          />
        </div>
      </div>

      {/* Teachable Perks Metric Card */}
      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 sm:p-5 backdrop-blur-xl shadow-sm dark:shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                {dict?.characterDetail?.teachablePerks || 'Teachable Perks'}
              </h3>
              <p className="text-sm sm:text-base font-black text-text-primary font-mono">
                {perkUnlocked} / {perkTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-accent-amber font-mono">
            {perkPercent}{'%'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full bg-accent-amber transition-all duration-500"
            style={{ width: `${perkPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
