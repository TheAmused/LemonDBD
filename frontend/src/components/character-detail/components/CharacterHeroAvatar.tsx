'use client';
// frontend/src/components/character-detail/components/CharacterHeroAvatar.tsx

import React, { useState } from 'react';
import { Eye, Shield, Skull, User } from 'lucide-react';
import type { CharacterItem } from '../types';
import { getAvatarUrl } from '../types';

export interface CharacterHeroAvatarTranslations {
  view3DModel?: string;
  interactiveViewer?: string;
  dlcLicensed?: string;
  dlcOriginal?: string;
}

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
        className="group relative w-full max-w-[280px] sm:max-w-[320px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border-color bg-bg-elevated shadow-lg dark:shadow-2xl cursor-pointer hover:border-accent-red/60 focus:outline-none focus:ring-2 focus:ring-accent-red transition-all duration-300 flex items-center justify-center"
        title={t.view3DModel || ''}
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
            <span className="text-xs font-mono font-bold text-text-secondary">{character.name}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center transition-opacity duration-200">
          <div className="h-12 w-12 rounded-2xl bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red mb-2 shadow-lg">
            <Eye className="h-6 w-6" />
          </div>
          <span className="text-xs font-black text-white uppercase tracking-wider">
            {t.view3DModel || ''}
          </span>
          <span className="text-[10px] text-slate-300 mt-1">
            {t.interactiveViewer || ''}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border backdrop-blur-md ${isSurvivor
                ? 'bg-accent-green/20 text-accent-green border-accent-green/40 shadow-sm'
                : 'bg-accent-red/20 text-accent-red border-accent-red/40 shadow-sm'
              }`}
          >
            {isSurvivor ? <Shield className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
            {roleLabel}
          </span>

          <span className="rounded-full bg-bg-elevated/80 border border-border-color px-2.5 py-0.5 text-[10px] font-bold text-text-secondary backdrop-blur-md">
            {character.is_licensed ? (t.dlcLicensed || '') : (t.dlcOriginal || '')}
          </span>
        </div>
      </div>
    </div>
  );
};