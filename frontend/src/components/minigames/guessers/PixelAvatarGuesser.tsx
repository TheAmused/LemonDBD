// frontend/src/components/minigames/guessers/PixelAvatarGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Sparkles, Check, X, ShieldAlert } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/api';

interface PixelAvatarGuesserProps {
  roundConfig: RoundConfig;
  characters: CatalogCharacter[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
  children?: React.ReactNode;
}

export const PixelAvatarGuesser: React.FC<PixelAvatarGuesserProps> = ({
  roundConfig,
  characters,
  guesses,
  isSolved,
  dict,
  children,
}) => {
  const targetChar = useMemo(() => {
    if (roundConfig.target_type) {
      const match = characters.find(
        (c) =>
          c.id === roundConfig.target_id &&
          c.role?.toLowerCase() === roundConfig.target_type?.toLowerCase()
      );
      if (match) return match;
    }
    return characters.find((c) => c.id === roundConfig.target_id);
  }, [characters, roundConfig.target_id, roundConfig.target_type]);

  // Progressive de-pixelation: blur level decreases on each guess
  const blurAmount = useMemo(() => {
    if (isSolved) return 0;
    const attempts = guesses.length;
    return Math.max(0, 18 - attempts * 4.5);
  }, [guesses.length, isSolved]);

  const rawUrl = targetChar?.avatar_url || '';
  const imageUrl = staticUrl(rawUrl) || rawUrl;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Blurred Portrait Frame */}
      <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-2xl overflow-hidden border-2 border-zinc-700/80 shadow-2xl bg-zinc-950 flex items-center justify-center">
        {imageUrl ? (
          <div
            className="relative w-full h-full transition-all duration-500 ease-out"
            style={{
              filter: `blur(${blurAmount}px) contrast(${100 + blurAmount * 4}%)`,
              transform: 'scale(1.05)',
            }}
          >
            <Image
              src={imageUrl}
              alt="Pixelated Character Avatar"
              fill
              unoptimized
              className="object-cover select-none pointer-events-none"
            />
          </div>
        ) : (
          <ShieldAlert className="w-12 h-12 text-zinc-600" />
        )}

        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/60 text-[11px] font-semibold text-zinc-300 flex items-center gap-1 shadow-md">
          <Sparkles className="w-3 h-3 text-accent-red" />
          <span>Blur: {blurAmount.toFixed(1)}px</span>
        </div>

        {isSolved && targetChar && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <div className="px-4 py-2 rounded-xl bg-emerald-600/90 text-white font-bold text-base shadow-xl border border-emerald-400/60 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{targetChar.name}</span>
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
                key={`avatar-g-${idx}`}
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
