'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/admin/AdminChallengeStats.tsx

import React from 'react';
import { Trophy, Skull, Rows3, BookOpen } from 'lucide-react';
import { AdminStats, ChallengeCompletionBreakdown } from '@/types/admin';

const MODE_CARD_CONFIG = [
  { key: 'gauntlet', icon: Trophy, color: 'text-amber-400', border: 'border-amber-500/20' },
  { key: 'chaos', icon: Skull, color: 'text-violet-400', border: 'border-violet-500/20' },
  { key: 'history', icon: Rows3, color: 'text-slate-400', border: 'border-slate-700' },
  { key: 'page_streak', icon: BookOpen, color: 'text-orange-400', border: 'border-orange-500/20' },
] as const;

interface AdminChallengeStatsProps {
  stats: AdminStats | null;
  dict?: Dictionary;
}

const VariantRow: React.FC<{
  label: string;
  breakdown: { completed_runs: number; unique_users: number };
  dict?: Dictionary;
}> = ({ label, breakdown, dict }) => (
  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
    <span className="font-bold text-slate-300">{label}</span>
    <span className="font-mono text-slate-400">
      <span className="text-slate-100 font-black">{breakdown.completed_runs}</span>{' '}
      {dict?.admin?.completionsLabel || 'completions'} {dict?.admin?.middotSeparator || '·'}{' '}
      {breakdown.unique_users} {dict?.admin?.usersLabel || 'users'}
    </span>
  </div>
);

export const AdminChallengeStats: React.FC<AdminChallengeStatsProps> = ({ stats, dict }) => {
  const completions = stats?.challenge_completions;

  const MODE_LABELS: Record<string, string> = {
    gauntlet: dict?.streaks?.gauntlet || 'Gauntlet',
    chaos: dict?.streaks?.chaosStreak || 'Chaos Streak',
    history: dict?.streaks?.historyStreak || 'History Streak',
    page_streak: dict?.streaks?.pageStreak || 'Page Streak',
  };

  const VARIANT_LABELS: Record<string, string> = {
    survivor: dict?.characterDetail?.roleSurvivor || 'Survivor',
    killer: dict?.characterDetail?.roleKiller || 'Killer',
    easy: dict?.admin?.difficultyEasy || 'Easy',
    medium: dict?.admin?.difficultyMedium || 'Medium',
    hell: dict?.admin?.difficultyHell || 'Hell',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {MODE_CARD_CONFIG.map(({ key, icon: Icon, color, border }) => {
        const label = MODE_LABELS[key];
        const breakdown: ChallengeCompletionBreakdown | undefined = completions?.[key];
        const variants = Object.entries(breakdown?.by_variant || {});

        return (
          <div key={key} className={`rounded-2xl border ${border} bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-200">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </h3>
              <div className="text-right">
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {breakdown?.total.completed_runs ?? '-'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {breakdown?.total.unique_users ?? '-'} {dict?.admin?.uniqueUsersLabel || 'unique users'}
                </div>
              </div>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-1.5">
                {variants.map(([variant, counts]) => (
                  <VariantRow key={variant} label={VARIANT_LABELS[variant] || variant} breakdown={counts} dict={dict} />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                {dict?.admin?.pageStreakCompletionsNotice || "Page Streak has one run per killer, so completions aren't broken down further here."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
