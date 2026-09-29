// frontend/src/components/minigames/guessers/AddonGuesser.tsx
'use client';

import React from 'react';
import { Package, Check, X } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';

interface AddonGuesserProps {
  roundConfig: RoundConfig;
  killers: CatalogCharacter[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
  children?: React.ReactNode;
}

export const AddonGuesser: React.FC<AddonGuesserProps> = ({
  roundConfig,
  killers,
  guesses,
  isSolved,
  dict,
  children,
}) => {
  const attempts = guesses.length;
  const description =
    (roundConfig.custom_data?.description as string) ||
    'Tremendously increases the active range of the Killer power while reducing charge recovery speed.';

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Add-on Display Card */}
      <div className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-3">
          <Package className="w-7 h-7" />
        </div>

        <div className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-2">
          Killer Add-on Modifier
        </div>

        <p className="text-sm text-zinc-200 leading-relaxed font-medium bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
          {description}
        </p>

        {attempts >= 2 && (
          <div className="mt-4 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300">
            Hint: High Rarity Add-on
          </div>
        )}

        {isSolved && (
          <div className="mt-6 px-4 py-1.5 rounded-lg bg-emerald-600/90 text-white font-bold text-sm flex items-center gap-2 shadow-md">
            <Check className="w-4 h-4" />
            <span>Solved!</span>
          </div>
        )}
      </div>

      {/* Interactive Input Slot */}
      {children && <div className="w-full max-w-xl my-4">{children}</div>}

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-lg mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`addon-g-${idx}`}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                  isCorrect
                    ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-md'
                    : 'bg-red-950/70 text-red-200 border-red-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-zinc-400">#{idx + 1}</span>
                  <span>{g.guess.name}</span>
                </div>
                {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-60" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
