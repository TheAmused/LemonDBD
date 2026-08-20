// frontend/src/components/streaks/chaos/ChaosRulesModal.tsx
'use client';

import React, { useEffect } from 'react';
import { X, BookOpen, AlertTriangle, Trophy, Dices } from 'lucide-react';

export interface ChaosRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIFFICULTY_ROWS = [
  { label: 'Easy', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', text: 'A checkpoint banks every 5 wins.' },
  { label: 'Medium', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', text: 'A checkpoint banks every 10 wins.' },
  { label: 'Hell', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', text: 'No checkpoints. One loss resets everything.' },
];

export const ChaosRulesModal: React.FC<ChaosRulesModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-600 dark:text-violet-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Chaos Streak Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How the draw, the pick, and the checkpoints work
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
            <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Dices className="w-4 h-4" />
              Chaos Concept
            </h3>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Pull the lever to draw 4 random perks from every unlocked killer perk you own, plus 2 addon
              rarity requirements. Nothing repeats until the whole pool has been drawn once. Then you pick
              which of your remaining killers plays the round, accept the pick, and play the trial with that
              build as your guide.
            </p>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <strong>A round only counts as won on 3 kills or more.</strong> Anything less is a loss.
            </p>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              You must play the killer with addons matching the 2 drawn rarities.
            </p>
            <p className="mt-2 leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Win with every killer you own on this difficulty and the run is complete.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-violet-500" />
              Difficulty & Checkpoints
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {DIFFICULTY_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl gap-2 shadow-sm"
                >
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${row.badgeColor} whitespace-nowrap w-fit`}>
                    {row.label}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{row.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 leading-relaxed text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Losing after a checkpoint only falls back to that checkpoint, not to zero, though every killer
              cleared since then goes back into the pool.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/80 border border-violet-500/20 rounded-xl p-4 space-y-2 shadow-sm">
            <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              Exceptions & Clarifications
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <li>
                <strong>Game cancelled:</strong> someone left while the lobby was loading and the match never
                started. No reroll, replay the same build.
              </li>
              <li>
                <strong>Hackers:</strong> obvious cheaters void the match. No reroll, replay the same build.
              </li>
              <li>
                <strong>Crash or server failure:</strong> not a loss. No reroll, replay the same build.
              </li>
              <li>
                <strong>No dodging:</strong> play whatever lobby you get, no matter the items.
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md shadow-violet-500/20"
          >
            Got It, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
