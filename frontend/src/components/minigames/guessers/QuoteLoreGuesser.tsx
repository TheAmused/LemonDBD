// frontend/src/components/minigames/guessers/QuoteLoreGuesser.tsx
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Quote, BookOpen, Check, X } from 'lucide-react';
import type { GuessRecord, RoundConfig, CatalogCharacter, CatalogPerk } from '@/types/minigame';
import { staticUrl } from '@/utils/api';
import { useDictionary } from "@/context/DictionaryContext";
import { InfoChip } from '@/components/common/InfoChip';
import { Surface } from '@/components/common/Surface';
import { formatMessage } from '@/utils/i18nFormat';

interface QuoteLoreGuesserProps {
  roundConfig: RoundConfig;
  characters: CatalogCharacter[];
  perks: CatalogPerk[];
  guesses: GuessRecord[];
  isSolved: boolean;
  children?: React.ReactNode;
}

export const QuoteLoreGuesser: React.FC<QuoteLoreGuesserProps> = ({ roundConfig, characters, perks, guesses, isSolved, children }) => {
  const dict = useDictionary();
  const customData = roundConfig.custom_data || {};
  const quoteText =
    (customData.quote as string) ||
    '“Death is not an escape. There is only an endless cycle of trial and torment.”';

  const isPerkQuote = customData.quote_type === 'perk_quote';
  const roleHint = customData.role as string | undefined;
  const chapterHint = customData.chapter_name as string | undefined;
  const releaseYear = customData.release_year as number | undefined;

  const targetChar = useMemo(() => {
    if (roundConfig.target_type === 'perk') return null;
    return characters.find((c) => c.id === roundConfig.target_id);
  }, [characters, roundConfig.target_id, roundConfig.target_type]);

  const targetPerk = useMemo(() => {
    if (roundConfig.target_type !== 'perk') return null;
    return perks.find((p) => p.id === roundConfig.target_id);
  }, [perks, roundConfig.target_id, roundConfig.target_type]);

  const attempts = guesses.length;

  // Progressive hints unlocked per wrong attempt
  const clue1 = attempts >= 1 && roleHint ? `Entity Role: ${roleHint}` : null;
  const clue2 = attempts >= 2 && chapterHint ? `Chapter: ${chapterHint}${releaseYear ? ` (${releaseYear})` : ''}` : null;
  const targetName = targetChar?.name || targetPerk?.name || '';
  const clue3 = attempts >= 3 && targetName ? formatMessage(dict.minigames.nameStartsWith, { letter: targetName[0] }) : null;

  const solvedImgRaw = targetChar?.avatar_url || targetPerk?.icon_url || '';
  const solvedImg = staticUrl(solvedImgRaw) || solvedImgRaw;

  return (
    <div className="w-full flex flex-col items-center my-6">
      {/* Quote / Lore Clue Card */}
      <Surface padding="none" className="w-full max-w-xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Atmospheric Quote Icon Header */}
        <div className="flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red type-label-sm">
          {isPerkQuote ? <Quote className="icon-sm" /> : <BookOpen className="icon-sm" />}
          <span>{dict.minigames.modes.quote_lore}</span>
        </div>

        {/* The Quote / Lore Body */}
        <blockquote className="text-base sm:text-lg font-medium text-text-primary italic leading-relaxed whitespace-pre-line max-h-72 overflow-y-auto px-2">
          {quoteText}
        </blockquote>

        {/* Unlocked Progressive Clues */}
        {(clue1 || clue2 || clue3) && (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-4 mt-4 border-t border-border-color">
            {clue1 && (
              <InfoChip>
                {clue1}
              </InfoChip>
            )}
            {clue2 && (
              <InfoChip>
                {clue2}
              </InfoChip>
            )}
            {clue3 && (
              <InfoChip>
                {clue3}
              </InfoChip>
            )}
          </div>
        )}

        {/* Solved Victory State */}
        {isSolved && (targetChar || targetPerk) && (
          <div className="mt-6 px-4 py-2 rounded-card bg-accent-green text-text-inverted type-card-title flex items-center gap-3 shadow-lg">
            {solvedImg && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border-subtle select-none">
                <Image
                  src={solvedImg}
                  alt={targetName}
                  fill
                  draggable={false}
                  className="object-cover select-none pointer-events-none"
                />
              </div>
            )}
            <Check className="icon-md" />
            <span>{dict.minigames.attributeValues.correct}: {targetName}</span>
          </div>
        )}
      </Surface>

      {/* Input & Action Controls Slot */}
      {children && <div className="w-full max-w-xl my-3">{children}</div>}

      {/* Prior Guesses List */}
      {guesses.length > 0 && (
        <div className="w-full max-w-xl mt-6 space-y-2 max-h-80 overflow-y-auto pr-1">
          {guesses.map((g, idx) => {
            const isCorrect = g.evaluation.is_correct;
            return (
              <div
                key={`quote-g-${idx}`}
                className={`flex items-center justify-between px-4 py-2.5 rounded-card border font-semibold text-sm transition-all ${
                  isCorrect
                    ? 'bg-accent-green text-text-inverted border-accent-green shadow-md'
                    : 'bg-accent-red/20 text-accent-red border-accent-red/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-text-muted">#{idx + 1}</span>
                  <span>{g.guess.name}</span>
                  {g.guess.role && (
                    <span className="text-2xs text-text-muted uppercase tracking-wider">
                      ({g.guess.role})
                    </span>
                  )}
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
