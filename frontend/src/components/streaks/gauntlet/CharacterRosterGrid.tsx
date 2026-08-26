// frontend/src/components/streaks/gauntlet/CharacterRosterGrid.tsx
'use client';

import React, { useState } from 'react';
import { Role } from '@/types/gauntletStreak';
import { OwnedCharacterItem } from './useOwnedCharacters';
import { Check, User, Skull, ShieldCheck } from 'lucide-react';
import { avatarUrlForCharacter } from '@/utils/staticUrl';

export interface CharacterRosterGridProps {
  role: Role;
  characters: OwnedCharacterItem[];
  completedCharacters: string[];
  checkpointCharacters?: string[];
  activeCharacterId?: string;
  loading?: boolean;
}

export const CharacterRosterGrid: React.FC<CharacterRosterGridProps> = ({
  role,
  characters = [],
  completedCharacters = [],
  checkpointCharacters = [],
  activeCharacterId,
  loading = false,
}) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
    avatarUrlForCharacter(char.name, role === 'survivor' ? 'survivors' : 'killers');

  const completedCount = characters.filter((c) => isCompleted(c.name)).length;

  return (
    <div className="w-full bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {role === 'survivor' ? (
              <User className="w-5 h-5 text-amber-500" />
            ) : (
              <Skull className="w-5 h-5 text-red-500" />
            )}
            <span className="capitalize">{role}</span> Roster Progress
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete matches with each owned character to master the roster.
          </p>
        </div>

        <div className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
          Completed: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{completedCount}</span> / {characters.length}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 animate-pulse">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
          You don't own any {role} characters yet. Head to the Characters tab to mark what you own.
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4">
          {characters.map((char) => {
            const completed = isCompleted(char.name);
            const active = isActiveTarget(char.name);
            const checkpoint = isCheckpoint(char.name);
            const avatarUrl = getAvatarUrl(char);
            const hasError = imageErrors[char.name];

            let cardBorder = 'border-slate-200 hover:border-slate-400 bg-white dark:border-slate-800 dark:hover:border-slate-600 dark:bg-slate-950/60 shadow-sm';
            if (completed) {
              cardBorder = 'border-emerald-500 shadow-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/30 border-2';
            } else if (active) {
              cardBorder = 'border-amber-500 animate-pulse shadow-lg shadow-amber-500/20 border-2 bg-amber-500/10 dark:bg-amber-950/20';
            }

            return (
              <div
                key={char.name}
                className={`relative group rounded-xl border p-2 flex flex-col items-center justify-between transition-all duration-200 ${cardBorder}`}
                title={`${char.name}${completed ? ' (Completed)' : active ? ' (Active Target)' : ''}`}
              >
                {completed && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-white dark:text-slate-950 p-1 rounded-full shadow-md z-10">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {active && !completed && (
                  <div className="absolute -top-2 -left-2 bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[9px] font-black z-10 uppercase tracking-tighter shadow-sm">
                    Target
                  </div>
                )}

                {checkpoint && !completed && !active && (
                  <div className="absolute -top-2 -right-2 bg-indigo-500 text-white p-1 rounded-full shadow-md z-10">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                )}

                <div className="w-full aspect-square rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 overflow-hidden flex items-center justify-center relative mb-2 shadow-inner">
                  {avatarUrl && !hasError ? (
                    <img
                      src={avatarUrl}
                      alt={char.name}
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        completed ? 'brightness-105' : !active ? 'opacity-90' : ''
                      }`}
                      onError={() => handleImageError(char.name)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                      {role === 'survivor' ? <User className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
                    </div>
                  )}
                </div>

                <span className="text-[11px] font-semibold text-center text-slate-700 dark:text-slate-200 line-clamp-1 w-full group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  {char.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
