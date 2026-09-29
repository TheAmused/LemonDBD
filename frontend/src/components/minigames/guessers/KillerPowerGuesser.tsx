// frontend/src/components/minigames/guessers/KillerPowerGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import { Flame, Check, X, ShieldAlert } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';

interface KillerPowerGuesserProps {
  roundConfig: RoundConfig;
  killers: CatalogCharacter[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
}

export const KillerPowerGuesser: React.FC<KillerPowerGuesserProps> = ({
  roundConfig,
  killers,
  guesses,
  isSolved,
  dict,
}) => {
  const targetKiller = useMemo(() => {
    return killers.find((k) => k.id === roundConfig.target_id);
  }, [killers, roundConfig.target_id]);

  const powerName = roundConfig.custom_data?.power_name || targetKiller?.power_name || 'Special Power';

  // Hints unveiled on guesses:
  // Guess 1: Speed hint
  // Guess 2: Terror radius hint
  // Guess 3+: Full power mechanics hint
  const attempts = guesses.length;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Power Clue Card */}
      <div className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl flex flex-col items-center gap-4 relative">
        <div className="w-14 h-14 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red">
          <Flame className="w-7 h-7" />
        </div>

        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">
            Killer Special Power
          </div>
          <h3 className="text-xl font-bold text-zinc-100">{powerName}</h3>
        </div>

        {/* Unlocked Clues */}
        <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-zinc-800">
          {attempts >= 1 && targetKiller && (
            <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
              Movement Speed: {targetKiller.speed || 4.6} m/s
            </span>
          )}
          {attempts >= 2 && targetKiller && (
            <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
              Terror Radius: {targetKiller.terror_radius || 32}m
            </span>
          )}
          {attempts >= 3 && targetKiller && (
            <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
              Height: {targetKiller.height || 'Average'}
            </span>
          )}
        </div>

        {isSolved && targetKiller && (
          <div className="mt-2 px-4 py-1.5 rounded-lg bg-emerald-600/90 text-white font-bold text-sm flex items-center gap-2 shadow-md">
            <Check className="w-4 h-4" />
            <span>{targetKiller.name}</span>
          </div>
        )}
      </div>

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-lg mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`power-g-${idx}`}
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
