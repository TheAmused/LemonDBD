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
  const t = dict.minigames;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Emoji Riddle Display Card */}
      <div className="w-full max-w-md p-8 rounded-2xl bg-bg-surface border border-border-color shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="text-xs uppercase tracking-widest text-text-muted font-semibold mb-3">
          {t.modes.emoji_riddle}
        </div>
        <div className="text-5xl sm:text-6xl tracking-widest py-3 select-none">
          {emojis}
        </div>

        {attempts >= 2 && (
          <div className="mt-4 px-3 py-1 rounded-full bg-bg-elevated border border-border-subtle text-xs font-semibold text-text-secondary">
            {roundConfig.target_type === 'perk' ? t.attributes.perk : t.attributes.character}
          </div>
        )}

        {isSolved && (
          <div className="mt-6 px-4 py-1.5 rounded-lg bg-accent-green text-text-inverted font-bold text-sm flex items-center gap-2 shadow-md">
            <Check className="w-4 h-4" />
            <span>{t.attributeValues.correct}</span>
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
                    ? 'bg-accent-green text-text-inverted border-accent-green shadow-md'
                    : 'bg-accent-red/20 text-accent-red border-accent-red/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-text-muted">#{idx + 1}</span>
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
