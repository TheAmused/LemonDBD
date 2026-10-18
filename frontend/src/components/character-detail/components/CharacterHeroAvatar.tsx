'use client';
// frontend/src/components/character-detail/components/CharacterHeroAvatar.tsx

import React, { useState } from 'react';
import { User, ZoomIn } from 'lucide-react';
import type { CharacterItem, CharacterDetailDictionary } from '../types';
import { getAvatarUrl } from '../types';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { Badge } from '@/components/common/Badge';
export type CharacterHeroAvatarTranslations = Pick<CharacterDetailDictionary, 'view3DModel' | 'dlcLicensed' | 'dlcOriginal'>;

interface CharacterHeroAvatarProps {
  character: CharacterItem;
  isSurvivor: boolean;
  roleLabel: string;
  backendBase: string;
  onOpenModelModal: () => void;
  t: CharacterHeroAvatarTranslations;
}

export const CharacterHeroAvatar: React.FC<CharacterHeroAvatarProps> = ({
  character,
  isSurvivor,
  roleLabel,
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
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenModelModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenModelModal();
          }
        }}
        className="group relative w-full max-w-70 sm:max-w-80 aspect-[3/4] rounded-card overflow-hidden border-2 border-border-color bg-bg-elevated shadow-lg dark:shadow-2xl cursor-pointer hover:border-accent-red/60 focus:outline-none focus:ring-2 focus:ring-accent-red transition-all duration-300 flex items-center justify-center"
        {...tip(t.view3DModel, undefined, 'action')}
        aria-label={heroAriaLabel}
      >
        {!imgFailed ? (
          <img
            src={getAvatarUrl(backendBase, character, isSurvivor)}
            alt={character.name}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-text-muted">
            <User className="h-16 w-16 mb-2 opacity-50" />
            <span className="type-strong text-text-secondary">{character.name}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-bg-primary/70 opacity-0 group-hover:opacity-100 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center transition-opacity duration-200">
          <div className="h-12 w-12 rounded-card bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red mb-2 shadow-lg group-hover:scale-110 transition-transform">
            <ZoomIn className="h-6 w-6" />
          </div>
          <span className="type-label-sm text-text-inverted">
            {t.view3DModel}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-transparent to-transparent pointer-events-none" />

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <Badge
            tone={isSurvivor ? 'green' : 'red'} size="md" plain className="backdrop-blur-md"
          >
            {isSurvivor ? <SurvivorIcon className="h-3.5 w-3.5" /> : <KillerIcon className="h-3.5 w-3.5" />}
            {roleLabel}
          </Badge>

          <Badge tone="overlay" size="sm" plain className="backdrop-blur-md">
            {character.is_licensed ? t.dlcLicensed : t.dlcOriginal}
          </Badge>
        </div>
      </div>
    </div>
  );
};