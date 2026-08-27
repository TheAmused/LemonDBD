'use client';

import React, { useEffect } from 'react';
import { X, Swords, Lock } from 'lucide-react';

export interface GauntletModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOriginal: () => void;
  dict?: any;
}

export const GauntletModeModal: React.FC<GauntletModeModalProps> = ({
  isOpen,
  onClose,
  onSelectOriginal,
  dict,
}) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {dict?.streaks?.chooseGauntletMode || 'Choose a Gauntlet Mode'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onSelectOriginal}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 p-5 text-left transition-colors cursor-pointer"
          >
            <Swords className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-slate-900 dark:text-white">
              {dict?.streaks?.original || 'Original'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {dict?.streaks?.gauntletOriginalDescription ||
                "The classic Gauntlet: a build guide drawn from each character's own perks, escalating tiers."}
            </span>
          </button>

          <div className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-5 opacity-70">
            <Lock className="w-6 h-6 text-slate-400" />
            <span className="font-bold text-slate-500 dark:text-slate-400">
              {dict?.streaks?.lemonVersion || 'Lemon version'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {dict?.streaks?.comingSoon || 'Coming soon.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
