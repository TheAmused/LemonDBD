// frontend/src/components/streaks/history/HistoryRulesModal.tsx
'use client';

import React from 'react';
import { BookOpen, Trophy, Dices } from 'lucide-react';
import { RulesModalShell } from '../RulesModalShell';

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose }) => (
  <RulesModalShell
    isOpen={isOpen}
    onClose={onClose}
    icon={BookOpen}
    title="History Streak Rules"
    subtitle="How the roadmap, rows, and perk pool work"
    iconClassName="bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400"
    footerButtonClassName="bg-slate-600 hover:bg-slate-500"
  >
    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Dices className="w-4 h-4" />
        Concept
      </h3>
      <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        Your owned killers, sorted by release order, are grouped into rows of 5. Only the current row
        is playable. Beat every killer in it to unlock the next.
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        You start with every General perk unlocked. Beating a killer adds their own teachable perks
        to your pool. Addons and builds play no role here, pick a killer and play.
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic">
        For the full experience try to play killers in order from the oldest to newest. 🙂
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        The roster is locked in for the run you're on. New killers you unlock mid-run won't join until you reset, lose back to zero, or complete it.
      </p>
      <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
        An in-progress run untouched for 90 days automatically counts as a loss.
      </p>
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-slate-500" />
        Modes
      </h3>
      <div className="grid grid-cols-1 gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 whitespace-nowrap w-fit">
            Medium
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-right sm:max-w-xs">
            Checkpoints save each row you clear. A loss falls back to the row&apos;s start, not to
            zero.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-rose-500/20 text-rose-300 border-rose-500/30 whitespace-nowrap w-fit">
            Hell
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-right sm:max-w-xs">
            No checkpoints. One loss resets the whole run, every row and every unlocked perk.
          </p>
        </div>
      </div>
    </div>
  </RulesModalShell>
);
