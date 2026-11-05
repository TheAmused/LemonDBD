'use client';
// frontend/src/components/characters/hub/CharacterCard.tsx
import React from 'react';
import Link from 'next/link';
import { useDictionary } from '@/context/DictionaryContext';
import { DisabledBadge } from '@/components/DisabledBadge';
import { OwnershipClipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import type {
  CharacterItem} from '@/components/character-detail/types';
import {
  characterSlug,
  PORTRAIT_SHIFT,
  getAvatarUrl as resolveAvatarUrl,
  getAvatarThumbUrl,
} from '@/components/character-detail/types';

import { Button } from '@/components/common/Button';
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
      {char.is_disabled && !ownershipMode && (
        <DisabledBadge
          label={char.name}
          onClick={() => onOpenDisabled(char)}
          position="top-2 left-2"
        />
      )}

      {/* The portrait is a bust cropped at the bottom; the solid name bar under it covers that edge. */}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-bg-elevated">
        <Img
          src={avatarThumbSrc}
          alt={char.name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover object-top ${PORTRAIT_SHIFT} transition-transform duration-500 ${
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
        {/* Grey/dim only: owned and locked read from the colour, so no lock or tick badge. */}
        {ownershipMode && <OwnershipClipOverlay isOwned={isOwned} isPartial={hasPartialPerks} imageSrc={avatarSrc} imageClassName={PORTRAIT_SHIFT} />}

        {ownershipMode && !isOwned && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-20 flex justify-center sm:bottom-2">
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPerks(char);
              }}
              variant="amberSoft" size="xs" className="pointer-events-auto"
            >
              <span>{dict.filters.perks}</span>
              {perkStats.total > 0 && ` (${perkStats.unlocked}/${perkStats.total})`}
            </Button>
          </div>
        )}
      </div>

      <div className="pointer-events-none relative z-20 shrink-0 border-t border-border-color bg-bg-surface px-2 py-2.5 transition-colors group-hover:bg-bg-elevated sm:py-3">
        <h3 className="w-full truncate px-1 text-center text-mini font-extrabold leading-tight text-text-primary transition-colors group-hover:text-accent-red sm:text-xs md:text-sm">
          {char.name}
        </h3>
      </div>
    </Surface>
  );
}
