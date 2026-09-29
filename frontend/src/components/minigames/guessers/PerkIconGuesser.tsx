// frontend/src/components/minigames/guessers/PerkIconGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Eye, Check, X, ShieldAlert } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogPerk } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/api';

interface PerkIconGuesserProps {
  roundConfig: RoundConfig;
  perks: CatalogPerk[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
}

export const PerkIconGuesser: React.FC<PerkIconGuesserProps> = ({
  roundConfig,
  perks,
  guesses,
  isSolved,
  dict,
}) => {
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
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-zinc-950 flex items-center justify-center">
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
              alt="Distorted Perk Icon"
              fill
              unoptimized
              className="object-contain select-none pointer-events-none"
            />
          </div>
        ) : (
          <ShieldAlert className="w-12 h-12 text-zinc-600" />
        )}

        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/60 text-[11px] font-semibold text-zinc-300 flex items-center gap-1 shadow-md">
          <Eye className="w-3 h-3 text-accent-red" />
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>

        {isSolved && targetPerk && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <div className="px-4 py-2 rounded-xl bg-emerald-600/90 text-white font-bold text-base shadow-xl border border-emerald-400/60 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{targetPerk.name}</span>
            </div>
          </div>
        )}
      </div>

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
