'use client';
// frontend/src/components/streaks/page-streak/PageStreakRoster.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { RosterEntry } from '@/types/pageStreak';
import { KillerRosterGrid } from './KillerRosterGrid';

interface PageStreakRosterProps {
  locale: string;
  roster: RosterEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  dict?: Dictionary;
}

export const PageStreakRoster: React.FC<PageStreakRosterProps> = ({
  locale,
  roster,
  loading,
  error,
  onRetry,
  dict,
}) => {
  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3 text-xs text-rose-300">
          <span>{error}</span>
          <button onClick={onRetry} className="font-bold underline cursor-pointer">
            {dict?.streaks?.retry || 'Retry'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-slate-500">
          {dict?.streaks?.loadingRoster || 'Loading roster…'}
        </p>
      ) : (
        <KillerRosterGrid locale={locale} roster={roster} dict={dict} />
      )}
    </div>
  );
};
