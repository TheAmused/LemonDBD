// frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx
'use client';

import React from 'react';
import { BookOpen, Trophy, Dices } from 'lucide-react';
import { RulesModalShell } from '../RulesModalShell';

export interface PageStreakRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dict?: any;
}

export const PageStreakRulesModal: React.FC<PageStreakRulesModalProps> = ({ isOpen, onClose, dict }) => (
  <RulesModalShell
    isOpen={isOpen}
    onClose={onClose}
    icon={BookOpen}
    title={dict?.streaks?.pageStreakRulesTitle || 'Page Streak Rules'}
    subtitle={dict?.streaks?.pageStreakRulesSubtitle || 'How pages, builds, and the perk pool work'}
    iconClassName="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
    footerButtonClassName="bg-orange-600 hover:bg-orange-500"
  >
    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Dices className="w-4 h-4" />
        Concept
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        Pick a killer. Every perk that killer's teachables have unlocked for you gets split into
        pages. Build the strongest loadout you can from the current page, then report whether the
        match was a win or a loss.
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        A win advances you to the next page. A loss sends you back to page 1 and starts a new
        attempt, current page included, though your page history is kept.
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        The page layout is locked in when you start the run. New perks you unlock mid-run won't
        reshuffle it until you reset.
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        An in-progress run untouched for 90 days automatically counts as a loss.
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-orange-500" />
        Progress
      </h3>
      <div className="grid grid-cols-1 gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-orange-500/20 text-orange-300 border-orange-500/30 whitespace-nowrap w-fit">
            Current
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-right sm:max-w-xs">
            Pages cleared so far on this attempt. Drops back to 0 on a loss.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-yellow-500/20 text-yellow-300 border-yellow-500/30 whitespace-nowrap w-fit">
            Best
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-right sm:max-w-xs">
            The furthest page you've ever reached on this killer, across every attempt.
          </p>
        </div>
      </div>
    </div>
  </RulesModalShell>
);
