// frontend/src/components/minigames/guessers/EmojiRiddleGuesser.tsx
'use client';

import React from 'react';
import { HelpCircle, Check, X } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter, CatalogPerk } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';

interface EmojiRiddleGuesserProps {
  roundConfig: RoundConfig;
  characters: CatalogCharacter[];
  perks: CatalogPerk[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
  children?: React.ReactNode;
}

export const EmojiRiddleGuesser: React.FC<EmojiRiddleGuesserProps> = ({
  roundConfig,
  characters,
  perks,
  guesses,
  isSolved,
  dict,
  children,
}) => {
  const emojis = roundConfig.custom_data?.emojis || '';
  const attempts = guesses.length;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Emoji Riddle Display Card */}
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-3">
          Emoji Riddle
        </div>
        <div className="text-5xl sm:text-6xl tracking-widest py-3 select-none">
          {emojis}
        </div>

        {attempts >= 2 && (
          <div className="mt-4 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300">
            Hint: {roundConfig.target_type === 'perk' ? 'Teachable Perk' : 'Character'}
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
        <div className="w-full max-w-md mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`emoji-g-${idx}`}
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
