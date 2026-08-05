import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { PageStreakRoster } from './page-streak/PageStreakRoster';

interface PageStreakBoardProps {
  locale: string;
}

export const PageStreakBoard: React.FC<PageStreakBoardProps> = ({ locale }) => (
  <div>
    <Link
      href={`/${locale}/streaks/killer`}
      className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 transition-colors hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>Back to killer streaks</span>
    </Link>

    <div className="mt-4 mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-slate-900/60">
        <BookOpen className="h-5 w-5 text-orange-400" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold tracking-wide text-slate-100">Page streak</h2>
        <p className="text-xs text-slate-500">
          Pick a killer. Win a round using perks from page 1, then move to page 2, and keep going through every page.
        </p>
      </div>
    </div>

    <PageStreakRoster locale={locale} />
  </div>
);
