// frontend/src/components/minigames/guessers/QuoteLoreGuesser.tsx
'use client';

import React from 'react';
import { Quote, Check, X } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter, CatalogPerk } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';

interface QuoteLoreGuesserProps {
  roundConfig: RoundConfig;
  characters: CatalogCharacter[];
  perks: CatalogPerk[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
}

export const QuoteLoreGuesser: React.FC<QuoteLoreGuesserProps> = ({
  roundConfig,
  characters,
  perks,
  guesses,
  isSolved,
  dict,
}) => {
  const quoteText =
    roundConfig.custom_data?.quote ||
    '“Death is not an escape. There is only an endless cycle of trial and torment.”';

  const speaker = roundConfig.custom_data?.speaker;
  const attempts = guesses.length;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Quote Display Card */}
      <div className="w-full max-w-xl p-8 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <Quote className="w-10 h-10 text-accent-red/40 mb-4" />
        <blockquote className="text-lg sm:text-xl font-medium text-zinc-100 italic leading-relaxed">
          {quoteText}
        </blockquote>

        {speaker && attempts >= 2 && (
          <div className="mt-4 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            — {speaker}
          </div>
        )}

        {isSolved && (
          <div className="mt-6 px-4 py-1.5 rounded-lg bg-emerald-600/90 text-white font-bold text-sm flex items-center gap-2 shadow-md">
            <Check className="w-4 h-4" />
            <span>Solved!</span>
          </div>
        )}
      </div>

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-xl mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`quote-g-${idx}`}
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
