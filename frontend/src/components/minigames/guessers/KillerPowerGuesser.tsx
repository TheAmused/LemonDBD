// frontend/src/components/minigames/guessers/KillerPowerGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import { Flame, Check, X } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter } from '@/types/minigame';
import { useDictionary } from "@/context/DictionaryContext";
import { InfoChip } from '@/components/common/InfoChip';
import { Surface } from '@/components/common/Surface';

interface KillerPowerGuesserProps {
  roundConfig: RoundConfig;
  killers: CatalogCharacter[];
  guesses: GuessRecord[];
  isSolved: boolean;
  children?: React.ReactNode;
}

export const KillerPowerGuesser: React.FC<KillerPowerGuesserProps> = ({ roundConfig, killers, guesses, isSolved, children }) => {
  const dict = useDictionary();
  const targetKiller = useMemo(
    () => killers.find((k) => k.id === roundConfig.target_id),
    [killers, roundConfig.target_id]
  );

  const attempts = guesses.length;
  const t = dict.minigames;

  // The power description is provided by the backend in custom_data to avoid
  // leaking power_name (which would trivially reveal the answer).
  const powerDescription: string =
    roundConfig.custom_data?.power_description ||
    targetKiller?.power_description ||
    '';

  // Progressive hints unlocked per wrong attempt
  const speedHint = attempts >= 1 && targetKiller?.movement_speed ? `${t.attributes.speed}: ${targetKiller.movement_speed}` : null;
  const radiusHint = attempts >= 2 && targetKiller?.terror_radius ? `${t.attributes.terror_radius}: ${targetKiller.terror_radius}` : null;
  const heightHint = attempts >= 3 && targetKiller?.height ? `${t.attributes.height}: ${targetKiller.height}` : null;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Power Clue Card */}
      <Surface padding="none" className="w-full max-w-lg p-6 shadow-2xl flex flex-col items-center gap-4 relative">
        {/* Icon placeholder — no power icon shown (would reveal identity) */}
        <div className="w-14 h-14 rounded-card bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red">
          <Flame className="w-7 h-7" />
        </div>

        <div className="text-center">
          <div className="type-label-sm text-text-muted mb-2">
            {t.modes.killer_power}
          </div>
          {/* Show description, NOT power_name */}
          <p className="type-body-lg text-text-secondary max-w-sm">
            {powerDescription}
          </p>
        </div>

        {/* Progressive hints */}
        {(speedHint || radiusHint || heightHint) && (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-border-color">
            {speedHint && (
              <InfoChip>
                {speedHint}
              </InfoChip>
            )}
            {radiusHint && (
              <InfoChip>
                {radiusHint}
              </InfoChip>
            )}
            {heightHint && (
              <InfoChip>
                {heightHint}
              </InfoChip>
            )}
          </div>
        )}

        {isSolved && targetKiller && (
          <div className="mt-2 px-4 py-1.5 rounded-chip bg-accent-green text-text-inverted type-card-title flex items-center gap-2 shadow-md">
            <Check className="icon-md" />
            <span>{targetKiller.name} — {targetKiller.power_name}</span>
          </div>
        )}
      </Surface>

      {/* Input & Action Controls Slot */}
      {children && <div className="w-full max-w-lg my-3">{children}</div>}

      {/* Prior Guesses */}
      {guesses.length > 0 && (
        <div className="w-full max-w-lg mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`power-g-${idx}`}
                className={`flex items-center justify-between px-4 py-2.5 rounded-card border font-semibold text-sm transition-all ${
                  isCorrect
                    ? 'bg-accent-green text-text-inverted border-accent-green shadow-md'
                    : 'bg-accent-red/20 text-accent-red border-accent-red/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-text-muted">#{idx + 1}</span>
                  <span>{g.guess.name}</span>
                </div>
                {isCorrect ? <Check className="icon-md" /> : <X className="icon-md opacity-60" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
