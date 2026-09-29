// frontend/src/components/minigames/guessers/ClassicPerkGuesser.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import type { GuessRecord } from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { staticUrl } from '@/utils/api';

interface ClassicPerkGuesserProps {
  guesses: GuessRecord[];
  dict: Dictionary;
}

export const ClassicPerkGuesser: React.FC<ClassicPerkGuesserProps> = ({
  guesses,
  dict,
}) => {
  if (guesses.length === 0) return null;
  const t = dict.minigames;

  return (
    <div className="w-full overflow-x-auto pb-4 my-6">
      <table className="w-full min-w-[600px] border-separate border-spacing-2 text-center select-none">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            <th className="p-2 w-32 text-left">{dict.filters.perks}</th>
            <th className="p-2 w-24">{t.attributes.role}</th>
            <th className="p-2 w-36">{dict.sidebar.characters}</th>
            <th className="p-2 w-28">{t.attributes.perk_type}</th>
            <th className="p-2 w-24">{t.attributes.is_licensed}</th>
          </tr>
        </thead>
        <tbody className="space-y-2">
          {guesses.map((item, rowIdx) => {
            const attrs = item.evaluation.attributes || {};
            const guess = item.guess;
            const imgSrc = staticUrl(guess.icon_url) || guess.icon_url;

            return (
              <tr
                key={`perk-guess-${rowIdx}-${guess.id}`}
                className="animate-in fade-in slide-in-from-top-3 duration-300 font-medium text-sm"
              >
                <td className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/60 flex-shrink-0 flex items-center justify-center">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={guess.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="object-contain w-full h-full p-0.5"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">?</span>
                      )}
                    </div>
                    <span className="truncate text-zinc-100 font-semibold text-xs leading-snug">
                      {guess.name}
                    </span>
                  </div>
                </td>

                <PerkAttrCell
                  evaluation={attrs.role}
                  value={guess.role || '-'}
                />

                <PerkAttrCell
                  evaluation={attrs.character_name}
                  value={guess.character_name || 'General'}
                />

                <PerkAttrCell
                  evaluation={attrs.perk_type}
                  value={guess.perk_type || 'General'}
                />

                <PerkAttrCell
                  evaluation={attrs.is_teachable}
                  value={guess.is_teachable ? t.attributeValues.yes : t.attributeValues.no}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const PerkAttrCell: React.FC<{ evaluation: any; value?: string | null }> = ({ evaluation, value }) => {
  const status = typeof evaluation === 'string' ? evaluation : evaluation?.status || 'incorrect';
  const isCorrect = status === 'correct';
  const isPartial = status === 'partial';

  const bgStyle = isCorrect
    ? 'bg-emerald-600/90 text-white border-emerald-400/80 shadow-emerald-950/40'
    : isPartial
    ? 'bg-amber-600/90 text-white border-amber-400/80 shadow-amber-950/40'
    : 'bg-red-950/80 text-red-200 border-red-800/60 shadow-red-950/40';

  return (
    <td className={`p-2.5 rounded-xl border shadow-md font-semibold text-xs transition-all ${bgStyle}`}>
      <div className="flex items-center justify-center gap-1">
        <span className="truncate max-w-[140px]">{value ?? '-'}</span>
        {isCorrect && <Check className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />}
      </div>
    </td>
  );
};
