'use client';
// frontend/src/components/streaks/page-streak/PageStreakRoster.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { RosterEntry } from '@/types/pageStreak';
import { KillerRosterGrid } from './KillerRosterGrid';
import { useDictionary } from "@/context/DictionaryContext";

interface PageStreakRosterProps {
  locale: string;
  roster: RosterEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const PageStreakRoster: React.FC<PageStreakRosterProps> = ({ locale, roster, loading, error, onRetry }) => {
  const dict = useDictionary();
  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-accent-red/30 bg-accent-red/[0.07] px-4 py-3 text-xs text-accent-red">
          <span>{error}</span>
          <button onClick={onRetry} className="font-bold underline cursor-pointer">
            {dict.streaks.retry}
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-text-muted">
          {dict.streaks.loadingRoster}
        </p>
      ) : (
        <KillerRosterGrid locale={locale} roster={roster} />
      )}
    </div>
  );
};
