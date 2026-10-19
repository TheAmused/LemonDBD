// frontend/src/components/minigames/guessers/ClassicCharacterGuesser.tsx
'use client';

import React from 'react';
import { ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import type { AttributeEvaluation, GuessRecord, NumericAttributeResult } from '@/types/minigame';
import { staticUrl } from '@/utils/api';
import { useDictionary } from "@/context/DictionaryContext";
import { Thumb } from '@/components/common/Thumb';

interface ClassicCharacterGuesserProps {
  guesses: GuessRecord[];
}

export const ClassicCharacterGuesser: React.FC<ClassicCharacterGuesserProps> = ({ guesses }) => {
  const dict = useDictionary();
  if (guesses.length === 0) {
    return null;
  }

  const t = dict.minigames;

  return (
    <div className="w-full max-h-list overflow-y-auto overflow-x-auto pb-4 my-6 rounded-card border border-border-color bg-bg-surface/30">
      <table className="w-full min-w-175 border-separate border-spacing-2 text-center select-none">
        <thead>
          <tr className="type-label-sm text-text-muted">
            <th className="p-2 w-28 text-left">{t.attributes.character}</th>
            <th className="p-2 w-20">{t.attributes.role}</th>
            <th className="p-2 w-20">{t.attributes.gender}</th>
            <th className="p-2 w-36">{t.attributes.chapter}</th>
            <th className="p-2 w-24">{t.attributes.release_year}</th>
            <th className="p-2 w-20">{t.attributes.is_licensed}</th>
            <th className="p-2 w-20">{t.attributes.height}</th>
          </tr>
        </thead>
        <tbody className="space-y-2">
          {guesses.map((item, rowIdx) => {
            const attrs = item.evaluation.attributes || {};
            const guess = item.guess;

            const imgSrc =
              staticUrl(guess.avatar_url) ||
              staticUrl(guess.icon_url) ||
              guess.avatar_url ||
              guess.icon_url;

            return (
              <tr
                key={`guess-${rowIdx}-${guess.id}`}
                className="animate-in fade-in slide-in-from-top-3 duration-300 font-medium text-sm"
              >
                {/* Character Name & Avatar */}
                <td className="p-2 rounded-card bg-bg-surface border border-border-color text-left">
                  <div className="flex items-center gap-2.5">
                    <Thumb src={imgSrc} alt={guess.name} size="lg" fallback={<span className="text-xs text-text-muted">?</span>} />
                    <span className="truncate text-text-primary font-semibold text-xs leading-snug">
                      {guess.name}
                    </span>
                  </div>
                </td>

                {/* Role */}
                <AttributeCell evaluation={attrs.role} value={guess.role || '-'} />

                {/* Gender */}
                <AttributeCell
                  evaluation={attrs.gender}
                  value={guess.gender || '-'}
                />

                {/* Chapter */}
                <AttributeCell
                  evaluation={attrs.chapter}
                  value={guess.chapter_name || '-'}
                />

                {/* Release Year */}
                <AttributeCell
                  evaluation={attrs.release_year}
                  value={guess.release_year ?? '-'}
                />

                {/* Licensed */}
                <AttributeCell
                  evaluation={attrs.is_licensed}
                  value={guess.is_licensed ? t.attributeValues.yes : t.attributeValues.no}
                />

                {/* Height */}
                <AttributeCell
                  evaluation={attrs.height}
                  value={guess.height || '-'}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface AttributeCellProps {
  evaluation?: AttributeEvaluation;
  value?: string | number | null;
}

const AttributeCell: React.FC<AttributeCellProps> = ({ evaluation, value }) => {
  let status = 'incorrect';
  let direction: 'higher' | 'lower' | undefined;

  if (typeof evaluation === 'string') {
    status = evaluation;
  } else if (evaluation && typeof evaluation === 'object') {
    const numEval = evaluation as NumericAttributeResult;
    status = numEval.status;
    direction = numEval.direction;
  }

  const isCorrect = status === 'correct';
  const isPartial = status === 'partial';

  const bgStyle = isCorrect
    ? 'bg-accent-green text-text-inverted border-accent-green shadow-accent-green/20'
    : isPartial
    ? 'bg-accent-amber text-text-inverted border-accent-amber shadow-accent-amber/20'
    : 'bg-accent-red/20 text-accent-red border-accent-red/40 shadow-accent-red/10';

  return (
    <td
      className={`p-2.5 rounded-card border shadow-md font-semibold text-xs transition-all relative ${bgStyle}`}
    >
      <div className="flex items-center justify-center gap-1">
        <span className="truncate max-w-30">{value ?? '-'}</span>
        {direction === 'higher' && (
          <ArrowUp className="w-3.5 h-3.5 text-text-inverted flex-shrink-0 animate-bounce" />
        )}
        {direction === 'lower' && (
          <ArrowDown className="w-3.5 h-3.5 text-text-inverted flex-shrink-0 animate-bounce" />
        )}
        {isCorrect && !direction && (
          <Check className="w-3.5 h-3.5 text-text-inverted flex-shrink-0" />
        )}
      </div>
    </td>
  );
};
