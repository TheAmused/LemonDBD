// frontend/src/components/minigames/guessers/KillerPowerGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import { Flame, Check, X } from 'lucide-react';
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
  const targetKiller = useMemo(
    () => killers.find((k) => k.id === roundConfig.target_id),
    [killers, roundConfig.target_id]
  );

  const attempts = guesses.length;

  // The power description is provided by the backend in custom_data to avoid
  // leaking power_name (which would trivially reveal the answer).
  const powerDescription: string =
    roundConfig.custom_data?.power_description ||
    targetKiller?.power_description ||
    'A special power unique to this Killer…';

  // Progressive hints unlocked per wrong attempt
  const speedHint = attempts >= 1 && targetKiller ? `Movement: ${targetKiller.movement_speed}` : null;
  const radiusHint = attempts >= 2 && targetKiller ? `Terror Radius: ${targetKiller.terror_radius}` : null;
  const heightHint = attempts >= 3 && targetKiller ? `Height: ${targetKiller.height}` : null;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Power Clue Card */}
      <div className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl flex flex-col items-center gap-4 relative">
        {/* Icon placeholder — no power icon shown (would reveal identity) */}
        <div className="w-14 h-14 rounded-2xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red">
          <Flame className="w-7 h-7" />
        </div>

        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
            Killer Special Power — Identify the Killer
          </div>
          {/* Show description, NOT power_name */}
          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm">
            {powerDescription}
          </p>
        </div>

        {/* Progressive hints */}
        {(speedHint || radiusHint || heightHint) && (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-zinc-800">
            {speedHint && (
              <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
                {speedHint}
              </span>
            )}
            {radiusHint && (
              <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
                {radiusHint}
              </span>
            )}
            {heightHint && (
              <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
                {heightHint}
              </span>
            )}
          </div>
        )}

        {isSolved && targetKiller && (
          <div className="mt-2 px-4 py-1.5 rounded-lg bg-emerald-600/90 text-white font-bold text-sm flex items-center gap-2 shadow-md">
            <Check className="w-4 h-4" />
            <span>{targetKiller.name} — {targetKiller.power_name}</span>
          </div>
        )}
      </div>

      {/* Prior Guesses */}
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
