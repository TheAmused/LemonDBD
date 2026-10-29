'use client';
// frontend/src/components/streaks/id-please/IdPleaseTiles.tsx

import React from 'react';
import { Sparkles } from 'lucide-react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { avatarUrlForCharacter, perkIconUrl, staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName, usePerkDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';
import type { IdPleaseCharacter, IdPleasePerk, IdPleaseSide } from '@/types/idPleaseStreak';
import { avatarFolder } from './idPleaseAssets';
import type { PerkCoordinate } from './usePerkCoordinates';

/** Where to find a perk in the in-game inventory: the [P/S] tag of the randomizers. Plain text under the icon. */
const PerkCoordinateLabel: React.FC<{ coordinate: PerkCoordinate | undefined; className?: string }> = ({ coordinate, className }) => {
  const g = useDictionary().generator;
  return (
    <span className={cn('text-tiny font-black leading-none tabular-nums text-accent-amber', className)}>
      {coordinate ? `${g.coordOpenPage}${coordinate.page}${g.coordSlot}${coordinate.slot}${g.coordClose}` : g.emptyCoordinate}
    </span>
  );
};

const artFrame = 'relative flex aspect-square w-full items-center justify-center overflow-hidden bg-bg-elevated';
const frame = 'relative flex flex-col items-center overflow-hidden rounded-control border border-border-color bg-bg-surface';
const label = 'min-h-two-lines line-clamp-2 w-full break-words px-1 pb-2 text-center text-mini font-medium leading-tight text-text-secondary';

export const IdPleaseCharacterTile: React.FC<{ character: IdPleaseCharacter; side: IdPleaseSide; className?: string }> = ({ character, side, className }) => {
  const displayName = useCharacterDisplayName();
  const name = displayName(character.name);
  const Fallback = side === 'killer' ? KillerIcon : SurvivorIcon;
  return (
    <div className={cn(frame, className)}>
      <div className={cn(artFrame, 'aspect-auto min-h-0 flex-1 basis-0')}>
        <PerkIcon
          // The stored path first: a name like "The Onryō" is saved as the_onryo, which the name alone would not find.
          src={staticUrl(character.avatar_local_path) || avatarUrlForCharacter(character.name, avatarFolder(side))}
          alt=""
          imageClassName="h-full w-full object-cover"
          fallbackIcon={<Fallback className="h-8 w-8 text-text-muted" aria-hidden="true" />}
        />
      </div>
      <span className={cn(label, 'pt-1.5')}>{name}</span>
    </div>
  );
};

export const IdPleasePerkTile: React.FC<{ perk: IdPleasePerk; coordinate: PerkCoordinate | undefined; className?: string }> = ({ perk, coordinate, className }) => {
  const displayName = usePerkDisplayName();
  const name = displayName(perk.name);
  return (
    <div className={cn(frame, className)}>
      <div className={artFrame}>
        <PerkIcon
          perk={perk}
          src={perkIconUrl(perk)}
          alt=""
          imageClassName="h-full w-full object-cover"
          fallbackIcon={<Sparkles className="h-6 w-6 text-text-muted" aria-hidden="true" />}
        />
      </div>
      <PerkCoordinateLabel coordinate={coordinate} className="py-1.5" />
      <span className={label}>{name}</span>
    </div>
  );
};
