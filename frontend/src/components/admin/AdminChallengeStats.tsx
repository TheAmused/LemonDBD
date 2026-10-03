'use client';
// frontend/src/components/admin/AdminChallengeStats.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { Rows3, BookOpen } from 'lucide-react';
import { AdminStats, ChallengeCompletionBreakdown } from '@/types/admin';
import { GauntletGloveIcon, ChaosSwirlIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from "@/context/DictionaryContext";

const MODE_CARD_CONFIG = [
  { key: 'gauntlet', icon: GauntletGloveIcon, color: 'text-text-secondary', border: 'border-border-color' },
  { key: 'chaos', icon: ChaosSwirlIcon, color: 'text-text-secondary', border: 'border-border-color' },
  { key: 'history', icon: Rows3, color: 'text-text-secondary', border: 'border-border-color' },
  { key: 'page_streak', icon: BookOpen, color: 'text-text-secondary', border: 'border-border-color' },
] as const;

interface AdminChallengeStatsProps {
  stats: AdminStats | null;
}

const VariantRow: React.FC<{
  label: string;
  breakdown: { completed_runs: number; unique_users: number };
}> = ({ label, breakdown }) => {
  const dict = useDictionary();
  return (
  <div className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg bg-bg-primary border border-border-subtle">
    <span className="font-bold text-text-primary">{label}</span>
    <span className="text-text-secondary">
      <span className="text-text-primary font-black">{breakdown.completed_runs}</span>{' '}
      {dict.admin.completionsLabel} {dict.admin.middotSeparator}{' '}
      {breakdown.unique_users} {dict.admin.usersLabel}
    </span>
  </div>
);
};

export const AdminChallengeStats: React.FC<AdminChallengeStatsProps> = ({ stats }) => {
  const dict = useDictionary();
  const completions = stats?.challenge_completions;

  const MODE_LABELS: Record<string, string> = {
    gauntlet: dict.streaks.gauntlet,
    chaos: dict.streaks.chaosStreak,
    history: dict.streaks.historyStreak,
    page_streak: dict.streaks.pageStreak,
  };

  const VARIANT_LABELS: Record<string, string> = {
    survivor: dict.characterDetail.roleSurvivor,
    killer: dict.characterDetail.roleKiller,
    easy: dict.admin.difficultyEasy,
    medium: dict.admin.difficultyMedium,
    hell: dict.admin.difficultyHell,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {MODE_CARD_CONFIG.map(({ key, icon: Icon, color, border }) => {
        const label = MODE_LABELS[key];
        const breakdown: ChallengeCompletionBreakdown | undefined = completions?.[key];
        const variants = Object.entries(breakdown?.by_variant || {});

        return (
          <div
            key={key}
            className={`rounded-2xl border ${border} bg-bg-surface p-5 shadow-sm backdrop-blur-sm transition-colors duration-200`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 type-label text-text-primary">
                <Icon className={`h-4 w-4 ${color}`} />
                <span>{label}</span>
              </h3>
              <div className="text-right">
                <div className="text-2xl font-black text-text-primary">
                  {breakdown?.total.completed_runs ?? '-'}
                </div>
              </div>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-1.5">
                {variants.map(([variant, counts]) => (
                  <VariantRow
                    key={variant}
                    label={VARIANT_LABELS[variant] || variant}
                    breakdown={counts}
                  />
                ))}
              </div>
            ) : (
              <p className="type-caption text-text-muted">
                {dict.admin.pageStreakCompletionsNotice}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

