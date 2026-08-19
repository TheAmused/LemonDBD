// frontend/src/components/character-detail/components/CharacterBreadcrumbs.tsx
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ArrowLeft, ArrowRight } from 'lucide-react';
import { CharacterItem, getCharacterSlug } from '../types';

interface CharacterBreadcrumbsProps {
  currentLocale: string;
  character: CharacterItem;
  roleLabel: string;
  isSurvivor: boolean;
  allCharacters: CharacterItem[];
  t: any;
}

export const CharacterBreadcrumbs: React.FC<CharacterBreadcrumbsProps> = ({
  currentLocale,
  character,
  roleLabel,
  isSurvivor,
  allCharacters,
  t,
}) => {
  const sameRoleCharacters = allCharacters.filter(
    (c) => (c.category || c.role || '').toLowerCase() === (character.category || character.role || '').toLowerCase()
  );
  const currentIndex = sameRoleCharacters.findIndex(
    (c) => c.name.toLowerCase() === character.name.toLowerCase()
  );
  const prevChar =
    currentIndex > 0
      ? sameRoleCharacters[currentIndex - 1]
      : sameRoleCharacters.length > 1
      ? sameRoleCharacters[sameRoleCharacters.length - 1]
      : null;
  const nextChar =
    currentIndex >= 0 && currentIndex < sameRoleCharacters.length - 1
      ? sameRoleCharacters[currentIndex + 1]
      : sameRoleCharacters.length > 1
      ? sameRoleCharacters[0]
      : null;

  const roleParam = isSurvivor ? 'Survivor' : 'Killer';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
        <Link
          href={`/${currentLocale}/characters`}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t.allCharacters || 'Characters Hub'}</span>
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <Link
          href={`/${currentLocale}/characters?role=${roleParam}`}
          className={`font-bold hover:underline transition-colors ${
            isSurvivor ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500' : 'text-rose-600 dark:text-rose-400 hover:text-rose-500'
          }`}
        >
          {roleLabel}
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-slate-900 dark:text-slate-100 font-bold truncate">{character.name}</span>
      </nav>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {prevChar && (
          <Link
            href={`/${currentLocale}/characters/${getCharacterSlug(prevChar.name)}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-all shadow-xs"
            title={`${t.prevCharacter || 'Previous'}: ${prevChar.name}`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden md:inline truncate max-w-[120px]">{prevChar.name}</span>
          </Link>
        )}
        {nextChar && (
          <Link
            href={`/${currentLocale}/characters/${getCharacterSlug(nextChar.name)}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-all shadow-xs"
            title={`${t.nextCharacter || 'Next'}: ${nextChar.name}`}
          >
            <span className="hidden md:inline truncate max-w-[120px]">{nextChar.name}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};
