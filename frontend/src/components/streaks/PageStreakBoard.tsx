import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface PageStreakBoardProps {
  locale: string;
}

export const PageStreakBoard: React.FC<PageStreakBoardProps> = ({ locale }) => (
  <div>
    <Link
      href={`/${locale}/streaks/killer`}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>Back to killer streaks</span>
    </Link>

    <div className="mt-4 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-slate-900/60">
        <BookOpen className="h-5 w-5 text-orange-400" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold tracking-wide text-slate-100">Page streak</h2>
        <p className="text-xs text-slate-500">
          Win a round using perks from page 1, then move to page 2, and keep going through all 12 perk pages.
        </p>
      </div>
    </div>

    <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 text-center">
      <p className="text-sm font-extrabold tracking-wide text-slate-400">
        Challenge mechanics coming next
      </p>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-600">
        Page tracking, win and loss handling and reset rules land in the next iteration.
      </p>
    </div>
  </div>
);
