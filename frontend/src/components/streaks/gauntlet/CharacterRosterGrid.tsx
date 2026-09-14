// frontend/src/components/streaks/gauntlet/CharacterRosterGrid.tsx
'use client';
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { Role } from '@/types/gauntletStreak';
import { OwnedCharacterItem } from './useOwnedCharacters';
import { Check, User, Skull, ShieldCheck } from 'lucide-react';
import { avatarUrlForCharacter, staticUrl } from '@/utils/staticUrl';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';

export interface CharacterRosterGridProps {
  role: Role;
  characters: OwnedCharacterItem[];
  completedCharacters: string[];
  checkpointCharacters?: string[];
  activeCharacterId?: string;
  loading?: boolean;
  dict?: Dictionary;
}

export const CharacterRosterGrid: React.FC<CharacterRosterGridProps> = ({
  role,
  characters = [],
  completedCharacters = [],
  checkpointCharacters = [],
  activeCharacterId,
  loading = false,
  dict,
}) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const displayName = useCharacterDisplayName();

  const handleImageError = (charName: string) => {
    setImageErrors((prev) => ({ ...prev, [charName]: true }));
  };

  const isCompleted = (charName: string) =>
    completedCharacters.some((c) => c.toLowerCase().trim() === charName.toLowerCase().trim());

  const isCheckpoint = (charName: string) =>
    checkpointCharacters.some((c) => c.toLowerCase().trim() === charName.toLowerCase().trim());

  const isActiveTarget = (charName: string) =>
    !!activeCharacterId && activeCharacterId.toLowerCase().trim() === charName.toLowerCase().trim();

  const getAvatarUrl = (char: OwnedCharacterItem) =>
    staticUrl(char.avatar_local_path) ||
    avatarUrlForCharacter(char.name, role === 'survivor' ? 'survivors' : 'killers');

  const completedCount = characters.filter((c) => isCompleted(c.name)).length;
  const roleLabel = role === 'survivor'
    ? (dict?.streaks?.survivor || dict?.generator?.survivor || 'Survivor')
    : (dict?.streaks?.killer || dict?.generator?.killer || 'Killer');

  const completedText = dict?.stats?.completed || dict?.streaks?.completed || 'Completed';
  const activeTargetText = dict?.streaks?.activeGauntletTarget || dict?.streaks?.target || 'Active Target';

  return (
    <div className="w-full bg-bg-surface border border-border-color rounded-2xl p-6 shadow-sm dark:shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-border-color pb-4">
        <div>
          <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
            {role === 'survivor' ? (
              <User className="w-5 h-5 text-accent-green" />
            ) : (
              <Skull className="w-5 h-5 text-accent-red" />
            )}
            <span>{roleLabel}</span> {dict?.streaks?.rosterProgress || 'Roster Progress'}
          </h3>
        </div>
        <div className="px-4 py-1.5 rounded-xl bg-bg-elevated border border-border-color text-xs font-bold text-text-secondary shadow-sm">
          {completedText}: <span className="text-accent-green font-extrabold">{completedCount}</span> / {characters.length}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 animate-pulse">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-bg-elevated" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm">
          {dict?.streaks?.noOwnedCharacters || `You don't own any ${role} characters yet. Head to the Characters tab to mark what you own.`}
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4">
          {characters.map((char) => {
            const completed = isCompleted(char.name);
            const active = isActiveTarget(char.name);
            const checkpoint = isCheckpoint(char.name);
            const avatarUrl = getAvatarUrl(char);
            const hasError = imageErrors[char.name];

            let cardBorder = 'border-border-color hover:border-border-subtle bg-bg-surface shadow-sm';
            if (completed) {
              cardBorder = 'border-accent-green bg-accent-green/10 border-2';
            } else if (active) {
              cardBorder = 'border-accent-red animate-pulse shadow-lg border-2 bg-accent-red/10';
            } else if (checkpoint) {
              cardBorder = 'border-accent-amber border-2 bg-accent-amber/10';
            }

            const statusSuffix = completed ? ` (${completedText})` : active ? ` (${activeTargetText})` : '';

            return (
              <div
                key={char.name}
                className={`relative group rounded-xl border p-2 flex flex-col items-center justify-between transition-all duration-200 ${cardBorder}`}
                title={`${displayName(char.name)}${statusSuffix}`}
              >
                {completed && (
                  <div className="absolute -top-2 -right-2 bg-accent-green text-white p-1 rounded-full shadow-md z-10">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
                {checkpoint && !completed && !active && (
                  <div className="absolute -top-2 -right-2 bg-accent-amber text-white p-1 rounded-full shadow-md z-10">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                )}

                <div className="w-full aspect-square rounded-lg bg-bg-elevated border border-border-color overflow-hidden flex items-center justify-center relative mb-2 shadow-inner">
                  {avatarUrl && !hasError ? (
                    <img
                      src={avatarUrl}
                      alt={displayName(char.name)}
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${completed ? 'brightness-105' : !active ? 'opacity-90' : ''
                        }`}
                      onError={() => handleImageError(char.name)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      {role === 'survivor' ? <User className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-semibold text-center text-text-secondary line-clamp-1 w-full group-hover:text-accent-red transition-colors">
                  {displayName(char.name)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};