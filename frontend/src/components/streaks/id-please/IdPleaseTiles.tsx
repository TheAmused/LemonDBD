'use client';
// frontend/src/components/streaks/id-please/IdPleaseTiles.tsx

import React from 'react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { PerkHexIcon, PersonIcon } from '@/components/icons/DbdIcons';
import { avatarUrlForCharacter, perkIconUrl, staticUrl } from '@/utils/staticUrl';
import { avatarThumbFromPath, getIconThumbUrl } from '@/utils/thumbUrl';
import { useCharacterDisplayName, usePerkLabel } from '@/context/DisplayNamesContext';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';
import { tip } from '@/components/common/Tooltip';
import type { IdPleaseCharacter, IdPleasePerk, IdPleaseSide } from '@/types/idPleaseStreak';
import { avatarFolder } from './idPleaseAssets';
import type { PerkCoordinate } from './usePerkCoordinates';

const artFrame = 'relative flex aspect-square w-full items-center justify-center overflow-hidden bg-bg-elevated';
const frame = 'relative flex flex-col items-center overflow-hidden rounded-control border border-border-color bg-bg-surface';
const label = 'min-h-two-lines line-clamp-2 w-full break-words px-1 pb-2 text-center text-mini font-medium leading-tight text-text-secondary';

export const IdPleaseCharacterTile: React.FC<{ character: IdPleaseCharacter; side: IdPleaseSide; className?: string }> = ({ character, side, className }) => {
  const displayName = useCharacterDisplayName();
  const name = displayName(character.name);
  return (
    <div className={cn(frame, className)}>
      <div className={cn(artFrame, 'aspect-auto min-h-0 flex-1 basis-0')}>
        <PerkIcon
          // The stored path first: a name like "The Onryō" is saved as the_onryo, which the name alone would not find.
          src={
            avatarThumbFromPath(
              staticUrl(character.avatar_local_path) || avatarUrlForCharacter(character.name, avatarFolder(side)),
              512
            ) || undefined
          }
          alt=""
          imageClassName="h-full w-full object-cover"
          fallbackIcon={<PersonIcon className="h-8 w-8 text-text-muted" aria-hidden="true" />}
        />
      </div>
      <span className={cn(label, 'pt-1.5')}>{name}</span>
    </div>
  );
};

/** A perk card: a large icon and a small [P/S] tag (where the perk sits in the in-game inventory) on the elevated background of the History perk pool. The name is in the tooltip. */
export const IdPleasePerkTile: React.FC<{ perk: IdPleasePerk; coordinate: PerkCoordinate | undefined; className?: string }> = ({ perk, coordinate, className }) => {
  const g = useDictionary().generator;
  const perkLabel = usePerkLabel();
  // By id first: the stored name can differ from the catalog's in casing or apostrophe.
  const name = perkLabel(perk)?.name ?? perk.name;
  return (
    <div className={cn(frame, 'bg-bg-elevated p-1', className)} {...tip(name, undefined, 'item')}>
      <div className={cn(artFrame, 'rounded-chip')}>
        <PerkIcon
          perk={perk}
          src={getIconThumbUrl(perkIconUrl(perk), 256) || undefined}
          alt={name}
          imageClassName="h-full w-full object-cover"
          fallbackIcon={<PerkHexIcon className="icon-xl text-text-muted" aria-hidden="true" />}
        />
      </div>
      <span className="pt-1 type-caption font-black leading-none tabular-nums text-accent-amber">
        {coordinate ? `${g.coordOpenPage}${coordinate.page}${g.coordSlot}${coordinate.slot}${g.coordClose}` : g.emptyCoordinate}
      </span>
    </div>
  );
};
