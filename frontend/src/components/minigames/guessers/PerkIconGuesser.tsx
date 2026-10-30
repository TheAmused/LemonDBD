// frontend/src/components/minigames/guessers/PerkIconGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Eye, Check, X, ShieldAlert } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogPerk } from '@/types/minigame';
import { staticUrl } from '@/utils/api';
import { useDictionary } from "@/context/DictionaryContext";
import { SolvedOverlay } from './SolvedOverlay';

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
      <div
        className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-card overflow-hidden border-2 border-border-color shadow-2xl bg-bg-surface flex items-center justify-center select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
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
              draggable={false}
              className="object-contain select-none pointer-events-none"
            />
          </div>
        ) : (
          <ShieldAlert className="w-12 h-12 text-text-muted" />
        )}

        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-bg-surface/80 backdrop-blur-md border border-border-subtle type-strong-xs text-text-secondary flex items-center gap-1 shadow-md">
          <Eye className="icon-xs text-accent-red" />
          <span>{Math.round(zoom * 100)}%</span>
        </div>

        {isSolved && targetPerk && <SolvedOverlay answer={targetPerk.name} />}
      </div>

      {/* Input & Action Controls Slot */}
      {children && <div className="w-full max-w-md my-3">{children}</div>}

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-md mt-6 space-y-2 max-h-80 overflow-y-auto pr-1">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`perk-icon-g-${idx}`}
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
