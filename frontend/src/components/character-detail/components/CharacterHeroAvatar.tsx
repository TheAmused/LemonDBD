'use client';
// frontend/src/components/character-detail/components/CharacterHeroAvatar.tsx

import React, { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { PersonIcon } from '@/components/icons/DbdIcons';
import type { CharacterItem, CharacterDetailDictionary } from '../types';
import { PORTRAIT_CROP, getAvatarUrl } from '../types';

import { Img } from '@/components/common/Img';
export type CharacterHeroAvatarTranslations = Pick<CharacterDetailDictionary, 'view3DModel'>;

interface CharacterHeroAvatarProps {
  character: CharacterItem;
  isSurvivor: boolean;
  /** The chapter / DLC the character came with. */
  chapterName: string;
  backendBase: string;
  onOpenModelModal: () => void;
  t: CharacterHeroAvatarTranslations;
}

export const CharacterHeroAvatar: React.FC<CharacterHeroAvatarProps> = ({
  character,
  isSurvivor,
  chapterName,
  backendBase,
  onOpenModelModal,
  t,
}) => {
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  const heroAriaLabel = t.view3DModel
    ? `${character.name} - ${t.view3DModel}`
    : character.name;

  return (
    <div className="lg:col-span-4 flex flex-col items-center w-full">
      <button type="button"
        onClick={onOpenModelModal}
        className="group relative flex w-full max-w-70 sm:max-w-80 aspect-[3/4] flex-col rounded-card overflow-hidden border-2 border-border-color bg-bg-elevated shadow-lg dark:shadow-2xl cursor-pointer hover:border-accent-red/60 focus:outline-none focus:ring-2 focus:ring-accent-red transition-all duration-300"
        aria-label={heroAriaLabel}
      >
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
          {!imgFailed ? (
            <Img
              src={getAvatarUrl(backendBase, character, isSurvivor)}
              alt={character.name}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className={`h-full w-full object-cover object-top ${PORTRAIT_CROP} transition-transform duration-700 group-hover:scale-120`}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-text-muted">
              <PersonIcon className="h-16 w-16 mb-2 opacity-50" />
              <span className="type-strong text-text-secondary">{character.name}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-bg-primary/70 opacity-0 group-hover:opacity-100 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center transition-opacity duration-200">
            <div className="h-12 w-12 rounded-card bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red mb-2 shadow-lg group-hover:scale-110 transition-transform">
              <ZoomIn className="icon-xl" />
            </div>
            <span className="type-label-sm text-text-inverted">
              {t.view3DModel}
            </span>
          </div>
        </div>

        {/* A solid strip, like the name on the character cards: it names the chapter and covers the portrait's cropped bottom edge. */}
        <div className="shrink-0 border-t border-border-color bg-bg-surface px-3 py-3 text-center text-xs font-extrabold leading-tight text-text-primary sm:text-sm">
          {chapterName}
        </div>
      </button>
    </div>
  );
};