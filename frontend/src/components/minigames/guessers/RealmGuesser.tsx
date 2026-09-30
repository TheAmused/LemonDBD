// frontend/src/components/minigames/guessers/RealmGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { MapPin, Eye, Check, X } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogRealm } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/api';

interface RealmGuesserProps {
  roundConfig: RoundConfig;
  realms: CatalogRealm[];
  guesses: GuessRecord[];
  isSolved: boolean;
  dict: Dictionary;
  children?: React.ReactNode;
}

export const RealmGuesser: React.FC<RealmGuesserProps> = ({
  roundConfig,
  realms,
  guesses,
  isSolved,
  dict,
  children,
}) => {
  const targetRealm = useMemo(() => {
    return realms.find((r) => r.id === roundConfig.target_id);
  }, [realms, roundConfig.target_id]);

  // Dynamic zoom: start at 240%, zoom out 30% per guess, down to 100%
  const zoomLevel = useMemo(() => {
    if (isSolved) return 100;
    const attempts = guesses.length;
    return Math.max(100, 240 - attempts * 30);
  }, [guesses.length, isSolved]);

  const rawUrl = targetRealm?.image_url || 'https://deadbydaylight.wiki.gg/images/RealmKeyArt_01.png?ea2add';
  const imageUrl = staticUrl(rawUrl) || rawUrl;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Visual Realm Cropped Frame */}
      <div className="relative w-full max-w-xl h-64 sm:h-80 rounded-2xl overflow-hidden border-2 border-border-color shadow-2xl bg-bg-surface flex items-center justify-center">
        <div
          className="relative w-full h-full transition-transform duration-700 ease-out origin-center"
          style={{
            transform: `scale(${zoomLevel / 100})`,
          }}
        >
          <Image
            src={imageUrl}
            alt={targetRealm?.name || 'Realm Clue'}
            fill
            unoptimized
            className="object-cover select-none pointer-events-none"
          />
        </div>

        {/* Clue overlay tag */}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-bg-elevated/80 backdrop-blur-md border border-border-color text-xs font-semibold text-text-secondary flex items-center gap-1.5 shadow-md">
          <Eye className="w-3.5 h-3.5 text-accent-red" />
          <span>{zoomLevel}%</span>
        </div>

        {isSolved && targetRealm && (
          <div className="absolute inset-0 bg-bg-primary/40 backdrop-blur-xs flex items-center justify-center">
            <div className="px-6 py-2.5 rounded-xl bg-accent-green text-text-inverted font-bold text-lg shadow-xl border border-accent-green flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>{targetRealm.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input & Action Controls Slot */}
      {children && <div className="w-full max-w-xl my-3">{children}</div>}

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-xl mt-6 space-y-2">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`realm-g-${idx}`}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                  isCorrect
                    ? 'bg-accent-green text-text-inverted border-accent-green shadow-md'
                    : 'bg-accent-red/20 text-accent-red border-accent-red/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 opacity-75" />
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
