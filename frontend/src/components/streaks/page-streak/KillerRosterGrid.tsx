'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Skull } from 'lucide-react';
import { RosterEntry } from '@/types/pageStreak';

interface KillerRosterGridProps {
  locale: string;
  roster: RosterEntry[];
}

export const KillerRosterGrid: React.FC<KillerRosterGridProps> = ({ locale, roster }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    {roster.map((entry) => {
      const done = entry.status === 'completed';
      const active = entry.status === 'in_progress';
      const pct = entry.page_count > 0 ? Math.round(((entry.current_page - 1) / entry.page_count) * 100) : 0;

      return (
        <Link
          key={entry.killer}
          href={`/${locale}/streaks/killer/page-streak/${encodeURIComponent(entry.killer)}`}
          className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            done
              ? 'border-emerald-500/40 bg-emerald-500/[0.07] hover:border-emerald-400/60'
              : active
                ? 'border-orange-500/45 bg-orange-500/[0.07] hover:border-orange-400/70'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
          }`}
        >
          {done && (
            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
          <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-900/80">
            <Skull className={`h-7 w-7 ${done ? 'text-emerald-400/70' : 'text-slate-600'}`} />
          </div>
          <div className="text-center text-xs font-bold text-slate-200">{entry.killer}</div>
          {active && (
            <div className="h-1 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div
            className={`text-center font-mono text-[10px] ${
              done ? 'text-emerald-400' : active ? 'text-orange-400' : 'text-slate-500'
            }`}
          >
            {done
              ? 'completed'
              : active
                ? `page ${entry.current_page} of ${entry.page_count}`
                : 'not started'}
          </div>
        </Link>
      );
    })}
  </div>
);
