'use client';
// frontend/src/components/characters/hub/CharacterCard.tsx
import React from 'react';
import Link from 'next/link';
import { useDictionary } from '@/context/DictionaryContext';
import { DisabledBadge } from '@/components/DisabledBadge';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import type {
  CharacterItem} from '@/components/character-detail/types';
import {
  characterSlug,
  getAvatarUrl as resolveAvatarUrl,
  getAvatarThumbUrl,
} from '@/components/character-detail/types';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { Img } from '@/components/common/Img';
interface CharacterCardProps {
  char: CharacterItem;
  locale: string;
  backendBase: string;
  ownershipMode: boolean;
  isOwned: boolean;
  perkStats: { total: number; unlocked: number };
  onToggleOwned: (characterId: number, role: string) => void;
  onOpenPerks: (character: CharacterItem) => void;
  onOpenDisabled: (character: CharacterItem) => void;
}

/**
 * One portrait tile: a real link to the detail page, or (in ownership mode) a toggle button.
 *
 * The whole tile used to be a clickable `<div>` that navigated in code: no keyboard access, no middle-click
 * or "open in new tab", and nothing for a crawler to follow to the 98 detail pages. Now a
 * full-size `<Link>` / `<button>` sits under the tile's own small buttons (badge, perks).
 */
export function CharacterCard({
  char,
  locale,
  backendBase,
  ownershipMode,
  isOwned,
  perkStats,
  onToggleOwned,
  onOpenPerks,
  onOpenDisabled,
}: CharacterCardProps) {
  const dict = useDictionary();
  const isSurvivor = char.category?.toLowerCase() === 'survivor';
  const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
  const showLockedOverlay = !isOwned;
  const avatarSrc = resolveAvatarUrl(backendBase, char, isSurvivor);
  const avatarThumbSrc = getAvatarThumbUrl(backendBase, char, isSurvivor);
  const slug = characterSlug(char);
  const detailHref = `/${locale}/characters/${slug}`;

  return (
    <Surface
      padding="none" className="group relative flex flex-col overflow-hidden hover:bg-bg-elevated hover:border-accent-red/50 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer touch-manipulation aspect-[3/4] w-full"
    >
      {ownershipMode ? (
        <button
          type="button"
          aria-pressed={isOwned}
          aria-label={char.name}
          onClick={() => {
            if (char.id) onToggleOwned(char.id, char.category);
          }}
          className="absolute inset-0 z-10 cursor-pointer rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-amber"
        />
      ) : (
        <Link
          href={detailHref}
          aria-label={char.name}
          className="absolute inset-0 z-10 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
        />
      )}
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20">
        <Badge
          tone={isSurvivor ? 'green' : 'red'} size="xs" plain className="backdrop-blur-md"
        >
          {isSurvivor ? <SurvivorIcon className="h-3 w-3" /> : <KillerIcon className="h-3 w-3" />}
          <span>
            {isSurvivor
              ? dict.characterDetail.roleSurvivor
              : dict.characterDetail.roleKiller}
          </span>
        </Badge>
      </div>

      {char.is_disabled && !ownershipMode && (
        <DisabledBadge
          label={char.name}
          onClick={() => onOpenDisabled(char)}
          position="top-2 left-2"
        />
      )}

      <div className="relative h-full w-full overflow-hidden bg-bg-elevated">
        <Img
          src={avatarThumbSrc}
          alt={char.name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover object-top transition-transform duration-500 ${
            char.is_disabled ? 'grayscale opacity-60' : ''
          } ${ownershipMode && showLockedOverlay ? '' : 'group-hover:scale-105'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.triedFull && avatarThumbSrc !== avatarSrc) {
              // Thumbnail route unavailable: use the full image instead.
              target.dataset.triedFull = '1';
              target.src = avatarSrc;
            } else if (!target.dataset.triedFallback) {
              target.dataset.triedFallback = '1';
              target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${slug}.webp`;
            } else if (target.dataset.triedFallback === '1') {
              target.dataset.triedFallback = '2';
              target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${slug}.png`;
            }
          }}
        />
        {ownershipMode && (
          <CharacterOwnershipOverlay
            isOwned={isOwned}
            hasPartialPerks={hasPartialPerks}
            avatarSrc={avatarSrc}
            lockedTitle={dict.modal.unownedPerk}
            ownedTitle={dict.filters.ownedOnly}
          />
        )}
      </div>

      {/* Sticky bottom overlay with centered name and perks button above */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center justify-end px-2 pt-10 pb-2 sm:pb-2.5 bg-gradient-to-t from-bg-surface via-bg-surface/85 to-transparent pointer-events-none">
        {ownershipMode && !isOwned && (
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPerks(char);
            }}
            variant="amberSoft" size="xs" className="mb-1 sm:mb-1.5 pointer-events-auto"
          >
            <span>{dict.filters.perks}</span>
            {perkStats.total > 0 && ` (${perkStats.unlocked}/${perkStats.total})`}
          </Button>
        )}
        <h3 className="w-full text-center font-extrabold text-mini sm:text-xs md:text-sm text-text-primary group-hover:text-accent-red transition-colors truncate px-1 pointer-events-none leading-tight">
          {char.name}
        </h3>
      </div>
    </Surface>
  );
}
