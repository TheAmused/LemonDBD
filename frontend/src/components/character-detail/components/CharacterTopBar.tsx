// frontend/src/components/character-detail/components/CharacterTopBar.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CharacterItem, CharacterDetailDictionary } from '../types';
import { characterSlug } from '../types';
import { buttonClassName } from '@/components/common/Button';
import { tip } from '@/components/common/Tooltip';

interface CharacterTopBarProps {
  currentLocale: string;
  character: CharacterItem;
  isSurvivor: boolean;
  allCharacters: CharacterItem[];
  t: CharacterDetailDictionary;
}

export const CharacterTopBar: React.FC<CharacterTopBarProps> = ({
  currentLocale,
  character,
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
      <Link
        href={`/${currentLocale}/characters?role=${roleParam}`}
        className={buttonClassName('secondary', 'sm', 'self-start sm:self-auto')}
      >
        <ArrowLeft className="icon-sm" aria-hidden="true" />
        <span>{t.backToCharacters}</span>
      </Link>

      <div className="hidden sm:flex items-center gap-2 self-end sm:self-auto">
        {prevChar && (
          <Link
            href={`/${currentLocale}/characters/${characterSlug(prevChar)}`}
            className={buttonClassName('secondary', 'sm')}
            {...tip(`${t.prevCharacter}: ${prevChar.name}`, undefined, 'character')}
          >
            <ArrowLeft className="icon-sm" />
            <span className="hidden md:inline truncate max-w-30">{prevChar.name}</span>
          </Link>
        )}
        {nextChar && (
          <Link
            href={`/${currentLocale}/characters/${characterSlug(nextChar)}`}
            className={buttonClassName('secondary', 'sm')}
            {...tip(`${t.nextCharacter}: ${nextChar.name}`, undefined, 'character')}
          >
            <span className="hidden md:inline truncate max-w-30">{nextChar.name}</span>
            <ArrowRight className="icon-sm" />
          </Link>
        )}
      </div>
    </div>
  );
};

