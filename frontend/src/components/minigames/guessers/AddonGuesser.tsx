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
  const description = (roundConfig.custom_data?.description as string) || '';
  const t = dict.minigames;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Add-on Display Card */}
      <div className="w-full max-w-lg p-6 rounded-2xl bg-bg-surface border border-border-color shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber mb-3">
          <Package className="w-7 h-7" />
        </div>

        <div className="text-xs uppercase tracking-widest text-text-muted font-semibold mb-2">
          {t.addonModifier}
        </div>

        <p className="text-sm text-text-primary leading-relaxed font-medium bg-bg-elevated p-4 rounded-xl border border-border-subtle">
          {description}
        </p>

        {attempts >= 2 && (
          <div className="mt-4 px-3 py-1 rounded-full bg-bg-elevated border border-border-subtle text-xs font-semibold text-text-secondary">
            {t.highRarityHint}
          </div>
        )}

        {isSolved && (
          <div className="mt-6 px-4 py-1.5 rounded-lg bg-accent-green text-text-inverted font-bold text-sm flex items-center gap-2 shadow-md">
            <Check className="w-4 h-4" />
            <span>{t.solved}</span>
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
