// frontend/src/components/minigames/guessers/PerkIconGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Eye, Check, X, ShieldAlert } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogPerk } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/api';
import { useDictionary } from "@/context/DictionaryContext";

interface PerkIconGuesserProps {
  roundConfig: RoundConfig;
  perks: CatalogPerk[];
  guesses: GuessRecord[];
  isSolved: boolean;
  children?: React.ReactNode;
}

export const PerkIconGuesser: React.FC<PerkIconGuesserProps> = ({ roundConfig, perks, guesses, isSolved, children }) => {
  const dict = useDictionary();
  const targetPerk = useMemo(() => {
    return perks.find((p) => p.id === roundConfig.target_id);
  }, [perks, roundConfig.target_id]);

  // Distortion parameters: zoom, rotation, and grayscale
  const attempts = guesses.length;
  const zoom = isSolved ? 1 : Math.max(1, 2.5 - attempts * 0.4);
  const rotationDeg = isSolved ? 0 : Math.max(0, 180 - attempts * 45);
  const grayscale = isSolved ? 0 : Math.max(0, 100 - attempts * 25);

  const rawUrl = targetPerk?.icon_url || '';
  const imageUrl = staticUrl(rawUrl) || rawUrl;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Distorted Perk Icon Frame */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden border-2 border-border-color shadow-2xl bg-bg-surface flex items-center justify-center">
        {imageUrl ? (
          <div
            className="relative w-32 h-32 sm:w-40 sm:h-40 transition-all duration-500 ease-out"
            style={{
              transform: `scale(${zoom}) rotate(${rotationDeg}deg)`,
              filter: `grayscale(${grayscale}%)`,
            }}
          >
            <Image
              src={imageUrl}
              alt={targetPerk?.name || dict.minigames.modes.perk_icon}
              fill
              unoptimized
              className="object-contain select-none pointer-events-none"
            />
          </div>
        ) : (
          <ShieldAlert className="w-12 h-12 text-text-muted" />
        )}

        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-bg-surface/80 backdrop-blur-md border border-border-subtle type-strong-xs text-text-secondary flex items-center gap-1 shadow-md">
          <Eye className="w-3 h-3 text-accent-red" />
          <span>{Math.round(zoom * 100)}%</span>
        </div>

        {isSolved && targetPerk && (
          <div className="absolute inset-0 bg-bg-primary/40 backdrop-blur-xs flex items-center justify-center">
            <div className="px-4 py-2 rounded-xl bg-accent-green text-text-inverted font-bold text-base shadow-xl border border-accent-green/60 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{targetPerk.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input & Action Controls Slot */}
      {children && <div className="w-full max-w-md my-3">{children}</div>}

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-md mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`perk-icon-g-${idx}`}
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
