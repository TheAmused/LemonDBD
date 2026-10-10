'use client';
// frontend/src/components/characters/hub/CharacterCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/context/DictionaryContext';
import { DisabledBadge } from '@/components/DisabledBadge';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import {
  CharacterItem,
  getCharacterSlug,
  getAvatarUrl as resolveAvatarUrl,
  getAvatarThumbUrl,
} from '@/components/character-detail/types';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

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

/** One portrait tile: opens the detail page, or toggles ownership while in ownership mode. */
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
  const router = useRouter();
  const isSurvivor = char.category?.toLowerCase() === 'survivor';
  const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
  const showLockedOverlay = !isOwned;
  const avatarSrc = resolveAvatarUrl(backendBase, char, isSurvivor);
  const avatarThumbSrc = getAvatarThumbUrl(backendBase, char, isSurvivor);
  const detailHref = `/${locale}/characters/${getCharacterSlug(char.name)}`;

  return (
    <div
      onMouseEnter={() => {
        if (!ownershipMode) router.prefetch(detailHref);
      }}
      onFocus={() => {
        if (!ownershipMode) router.prefetch(detailHref);
      }}
      onClick={() => {
        if (ownershipMode) {
          if (char.id) onToggleOwned(char.id, char.category);
        } else {
          router.push(detailHref);
        }
      }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border-color bg-bg-surface hover:bg-bg-elevated hover:border-accent-red/50 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer touch-manipulation aspect-[3/4] w-full"
    >
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 sm:px-2 text-micro sm:text-tiny font-bold border backdrop-blur-md ${
            isSurvivor
              ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
              : 'bg-accent-red/10 text-accent-red border-accent-red/30'
          }`}
        >
          {isSurvivor ? <SurvivorIcon className="h-3 w-3" /> : <KillerIcon className="h-3 w-3" />}
          <span>
            {isSurvivor
              ? dict.characterDetail.roleSurvivor
              : dict.characterDetail.roleKiller}
          </span>
        </span>
      </div>

      {char.is_disabled && !ownershipMode && (
        <DisabledBadge
          label={char.name}
          onClick={() => onOpenDisabled(char)}
          position="top-2 left-2"
        />
      )}

      <div className="relative h-full w-full overflow-hidden bg-bg-elevated">
        <img
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
              target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${getCharacterSlug(char.name)}.webp`;
            } else if (target.dataset.triedFallback === '1') {
              target.dataset.triedFallback = '2';
              target.src = `${backendBase}/static/avatars/${isSurvivor ? 'survivors' : 'killers'}/${getCharacterSlug(char.name)}.png`;
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPerks(char);
            }}
            className="mb-1 sm:mb-1.5 inline-flex items-center justify-center gap-1 rounded-full border border-accent-amber/50 bg-bg-surface/90 px-2.5 py-0.5 text-micro sm:text-tiny font-bold text-accent-amber hover:bg-accent-amber/20 hover:border-accent-amber transition-colors shadow-xs cursor-pointer pointer-events-auto select-none"
          >
            <span>{dict.filters.perks}</span>
            {perkStats.total > 0 && ` (${perkStats.unlocked}/${perkStats.total})`}
          </button>
        )}
        <h3 className="w-full text-center font-extrabold text-mini sm:text-xs md:text-sm text-text-primary group-hover:text-accent-red transition-colors truncate px-1 pointer-events-auto leading-tight">
          {char.name}
        </h3>
      </div>
    </div>
  );
}
