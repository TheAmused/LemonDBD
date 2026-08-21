// frontend/src/components/streaks/history/HistoryRulesModal.tsx
'use client';

import React, { useEffect } from 'react';
import { X, BookOpen, Trophy, Dices } from 'lucide-react';

export interface HistoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryRulesModal: React.FC<HistoryRulesModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-600 dark:text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                History Streak Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How the roadmap, rows, and perk pool work
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
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
              New killers you unlock mid-run won't join this History Streak until you reset it, lose all the way back to zero, or complete it — the roster is locked in for the run you're on. An in-progress run untouched for 90 days automatically counts as a loss.
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
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md"
          >
            Got It, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
