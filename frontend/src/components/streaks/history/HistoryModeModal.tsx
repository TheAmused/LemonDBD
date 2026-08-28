'use client';
// frontend/src/components/streaks/history/HistoryModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { X, Shield, Skull } from 'lucide-react';
import { HistoryMode } from '@/types/historyStreak';

export interface HistoryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: HistoryMode) => void;
  dict?: Dictionary;
}

const TILES: { mode: HistoryMode; label: string; desc: string; icon: React.ElementType }[] = [
  { mode: 'medium', label: 'Medium', desc: 'A checkpoint banks every row you clear.', icon: Shield },
  { mode: 'hell', label: 'Hell', desc: 'No checkpoints. One loss resets everything.', icon: Skull },
];

export const HistoryModeModal: React.FC<HistoryModeModalProps> = ({ isOpen, onClose, onSelectMode, dict }) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {dict?.streaks?.chooseMode || 'Choose a mode'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.mode}
                onClick={() => onSelectMode(tile.mode)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-400/30 bg-slate-500/5 hover:bg-slate-500/10 p-5 text-left transition-colors cursor-pointer"
              >
                <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
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
