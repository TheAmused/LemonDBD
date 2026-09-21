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
  t: Record<string, string>;
}

export const CharacterBreadcrumbs: React.FC<CharacterBreadcrumbsProps> = ({
  currentLocale,
  character,
  roleLabel,
  isSurvivor,
  allCharacters,
  t,
}) => {
  const targetCategory = (character.category || character.role || '').toLowerCase();
  const sameRoleCharacters = allCharacters.filter(
    (c) => (c.category || c.role || '').toLowerCase() === targetCategory
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:border-b sm:border-border-color pb-0 sm:pb-4 w-full">
      <nav aria-label={t.breadcrumbs || 'Breadcrumb Navigation'} className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
        <Link
          href={`/${currentLocale}/characters?role=${roleParam}`}
          className={`flex items-center gap-1 font-bold hover:underline transition-colors ${
            isSurvivor ? 'text-accent-green hover:text-accent-green-hover' : 'text-accent-red hover:text-accent-red-hover'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          {roleLabel}
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-bold truncate max-w-[150px] sm:max-w-[240px]">
          {character.name}
        </span>
      </nav>

      <div className="hidden sm:flex items-center gap-2 self-end sm:self-auto">
        {prevChar && (
          <Link
            href={`/${currentLocale}/characters/${getCharacterSlug(prevChar.name)}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-secondary text-xs font-bold transition-all shadow-sm active:scale-95"
            title={`${t.prevCharacter || 'Previous'}: ${prevChar.name}`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden md:inline truncate max-w-[120px]">{prevChar.name}</span>
          </Link>
        )}
        {nextChar && (
          <Link
            href={`/${currentLocale}/characters/${getCharacterSlug(nextChar.name)}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-secondary text-xs font-bold transition-all shadow-sm active:scale-95"
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

