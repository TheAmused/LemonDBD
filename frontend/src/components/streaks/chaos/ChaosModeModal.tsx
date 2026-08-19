// frontend/src/components/streaks/chaos/ChaosModeModal.tsx
'use client';

import React, { useEffect } from 'react';
import { X, Coins, Flame, Skull } from 'lucide-react';
import { Difficulty } from '@/types/chaosStreak';

export interface ChaosModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
}

const TILES: { difficulty: Difficulty; label: string; desc: string; icon: React.ElementType }[] = [
  { difficulty: 'easy', label: 'Easy', desc: 'A checkpoint banks every 5 wins.', icon: Coins },
  { difficulty: 'medium', label: 'Medium', desc: 'A checkpoint banks every 10 wins.', icon: Flame },
  { difficulty: 'hell', label: 'Hell', desc: 'No checkpoints. One loss resets everything.', icon: Skull },
];

export const ChaosModeModal: React.FC<ChaosModeModalProps> = ({ isOpen, onClose, onSelectDifficulty }) => {
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
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Choose a difficulty</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.difficulty}
                onClick={() => onSelectDifficulty(tile.difficulty)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 p-5 text-left transition-colors cursor-pointer"
              >
                <Icon className="w-6 h-6 text-violet-400" />
                <span className="font-bold text-slate-900 dark:text-white">{tile.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{tile.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
