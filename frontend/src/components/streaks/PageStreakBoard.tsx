// frontend/src/components/streaks/PageStreakBoard.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageStreakRoster } from './page-streak/PageStreakRoster';

interface PageStreakBoardProps {
  locale: string;
  dict?: any;
}

export const PageStreakBoard: React.FC<PageStreakBoardProps> = ({ locale, dict }) => (
  <div>
    <Link
      href={`/${locale}/streaks/killer`}
      className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>{dict?.streaks?.backToKillerStreaks || 'Back to killer streaks'}</span>
    </Link>

    <div className="mt-4 mb-6 flex items-center gap-3">
      <img
        src="/images/streaks/page-streak.jpg"
        alt=""
        className="h-11 w-11 rounded-xl border border-orange-500/20 object-cover shadow-sm"
      />
      <div>
        <h2 className="text-lg font-extrabold tracking-wide text-slate-900 dark:text-slate-100">
          {dict?.streaks?.pageStreak || 'Page streak'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {dict?.streaks?.pageStreakDesc ||
            'Pick a killer. Win a round using perks from page 1, then move to page 2, and keep going through every page.'}
        </p>
      </div>
    </div>

    <PageStreakRoster locale={locale} />
  </div>
);
