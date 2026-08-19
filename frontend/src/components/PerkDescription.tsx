'use client';
// frontend/src/components/PerkDescription.tsx

import React, { useMemo } from 'react';
import { createPerkTokenRegex, parseLineTokens } from '@/utils/perkUtils';

interface PerkDescriptionProps {
  description: string;
  perkName?: string;
  variant?: 'modal' | 'tooltip';
}

export const PerkDescription: React.FC<PerkDescriptionProps> = ({
  description,
  perkName = '',
  variant = 'modal',
}) => {
  const tokenRegex = useMemo(() => createPerkTokenRegex(perkName), [perkName]);

  const parsedLines = useMemo(() => {
    if (!description) return [];

    const cleaned = description
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/(?<=\S)\*(?=\s|$|[.,;:!?)])/g, '')
      .replace(/\*(?=[a-zA-Z0-9+%-])/g, '')
      .replace(/(?<=[a-zA-Z0-9+%-])\*/g, '');

    return cleaned
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [description]);

  if (!description || parsedLines.length === 0) {
    return null;
  }

  const isTooltip = variant === 'tooltip';

  return (
    <div
      className={
        isTooltip
          ? 'space-y-1 text-xs text-slate-200'
          : 'space-y-2.5 text-xs sm:text-sm leading-relaxed font-normal text-slate-300 dark:text-slate-300'
      }
    >
      {parsedLines.map((line, lineIdx) => {
        const strippedForQuote = line
          .replace(/^[\*\s_]+/, '')
          .replace(/[\*\s_]+$/, '');

        const isQuote =
          (strippedForQuote.startsWith('"') && strippedForQuote.endsWith('"')) ||
          (strippedForQuote.startsWith('“') && strippedForQuote.endsWith('”')) ||
          strippedForQuote.includes('"-') ||
          strippedForQuote.includes('”-') ||
          strippedForQuote.includes('" -') ||
          strippedForQuote.includes('“ -') ||
          /^["“].+["”](\s*[-–—].+)?$/.test(strippedForQuote);

        if (isQuote) {
          return (
            <div
              key={lineIdx}
              className={
                isTooltip
                  ? 'my-2 rounded-lg bg-slate-900/90 p-2 text-xs italic text-slate-300 font-serif shadow-inner'
                  : 'my-3 rounded-xl border-l-2 border-amber-500/80 bg-slate-900/60 dark:bg-slate-950/80 p-3 text-xs sm:text-sm italic text-slate-300 dark:text-slate-400 font-serif shadow-inner'
              }
            >
              {strippedForQuote}
            </div>
          );
        }

        const isBullet =
          line.startsWith('•') ||
          line.startsWith('* ') ||
          line.startsWith('- ') ||
          /^\*\s+[A-Za-z]/.test(line);

        const contentText = isBullet ? line.replace(/^[•\*\-]\s*/, '') : line;
        const tokens = parseLineTokens(contentText, lineIdx, tokenRegex, perkName);

        if (isBullet) {
          return (
            <li
              key={lineIdx}
              className={
                isTooltip
                  ? 'ml-4 list-disc my-1 text-xs leading-relaxed text-slate-200 marker:text-amber-400'
                  : 'ml-5 list-disc my-1.5 text-xs sm:text-sm leading-relaxed text-slate-300 dark:text-slate-300 marker:text-amber-400'
              }
            >
              {tokens}
            </li>
          );
        }

        return (
          <p
            key={lineIdx}
            className={
              isTooltip
                ? 'mb-1 text-xs leading-relaxed text-slate-200'
                : 'mb-2 text-xs sm:text-sm leading-relaxed text-slate-300 dark:text-slate-300'
            }
          >
            {tokens}
          </p>
        );
      })}
    </div>
  );
};
