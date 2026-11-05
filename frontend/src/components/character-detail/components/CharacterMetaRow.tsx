// frontend/src/components/character-detail/components/CharacterMetaRow.tsx
import React from 'react';
import { ArrowRight, BookOpen, Bookmark, Calendar } from 'lucide-react';
import type { CharacterDetailDictionary } from '../types';
import { Button } from '@/components/common/Button';
import { InfoChip } from '@/components/common/InfoChip';
import { WrapRow } from '@/components/common/WrapRow';

interface CharacterMetaRowProps {
  chapterName: string;
  releaseDate: string;
  isLicensed?: boolean;
  onOpenLore: () => void;
  t: CharacterDetailDictionary;
}

/**
 * The strip next to the character's name: the Lore button, then the chapter, release date and origin as flat chips.
 * The button carries the trailing arrow that marks a clickable control (see LinkPill); `items-stretch` gives
 * the chips on its line the button's height instead of their own.
 */
export const CharacterMetaRow: React.FC<CharacterMetaRowProps> = ({ chapterName, releaseDate, isLicensed, onOpenLore, t }) => (
  <WrapRow className="items-stretch">
    <Button
      variant="secondary"
      onClick={onOpenLore}
      leftIcon={<BookOpen className="icon-md" aria-hidden="true" />}
      rightIcon={<ArrowRight className="icon-sm text-text-muted" aria-hidden="true" />}
    >
      <span>{t.viewLore || ''}</span>
    </Button>

    {chapterName && (
      <InfoChip>
        <Bookmark className="icon-sm shrink-0" aria-hidden="true" />
        {chapterName}
      </InfoChip>
    )}

    <InfoChip>
      <Calendar className="icon-sm shrink-0" aria-hidden="true" />
      {releaseDate}
    </InfoChip>

    <InfoChip>{isLicensed ? t.dlcLicensed : t.dlcOriginal}</InfoChip>
  </WrapRow>
);
