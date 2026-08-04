'use client';

import React, { useState } from 'react';
import { Role } from '@/types/challenge';
import { Check, User, Skull, ShieldCheck } from 'lucide-react';

export interface CharacterItem {
  name: string;
  real_name?: string;
  short_name?: string;
  avatar_local_path?: string;
  avatar_url?: string;
  category: string;
}

export interface CharacterRosterGridProps {
  role: Role;
  characters: CharacterItem[];
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
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleImageError = (charName: string) => {
    setImageErrors((prev) => ({ ...prev, [charName]: true }));
  };

  const isCompleted = (charName: string) => {
    return completedCharacters.some(
      (c) => c.toLowerCase().trim() === charName.toLowerCase().trim()
    );
  };

  const isCheckpoint = (charName: string) => {
    return checkpointCharacters.some(
      (c) => c.toLowerCase().trim() === charName.toLowerCase().trim()
    );
  };

  const isActiveTarget = (charName: string) => {
    if (!activeCharacterId) return false;
    return activeCharacterId.toLowerCase().trim() === charName.toLowerCase().trim();
  };

  const getAvatarUrl = (char: CharacterItem) => {
    let rawPath = char.avatar_local_path;
    if (!rawPath && char.name) {
      const subDir = role === 'survivor' ? 'survivors' : 'killers';
      const sanitized = char.name
        .toLowerCase()
        .trim()
        .replace(/[\s\-/]+/g, '_')
        .replace(/[\\/*?:"<>|]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      rawPath = `avatars/${subDir}/${sanitized}.png`;
    }
    if (!rawPath) return char.avatar_url || null;
    const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
    return `${backendBase}/static/${cleanPath}`;
  };

  const completedCount = characters.filter((c) => isCompleted(c.name)).length;

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {/* Grid Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {role === 'survivor' ? (
              <User className="w-5 h-5 text-amber-500" />
            ) : (
              <Skull className="w-5 h-5 text-red-500" />
            )}
            <span className="capitalize">{role}</span> Roster Progress
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete matches with each character to master the roster.
          </p>
        </div>

        {/* Progress Counter */}
        <div className="px-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
          Completed: <span className="text-emerald-400 font-extrabold">{completedCount}</span> / {characters.length}
        </div>
      </div>

      {/* Grid Display */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 animate-pulse">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-slate-800" />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          No {role} characters available.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {characters.map((char) => {
            const completed = isCompleted(char.name);
            const active = isActiveTarget(char.name);
            const checkpoint = isCheckpoint(char.name);
            const avatarUrl = getAvatarUrl(char);
            const hasError = imageErrors[char.name];

            // Card Style determination according to spec:
            // Completed: border-emerald-500 shadow-emerald-500/30 bg-emerald-950/30
            // Active target: border-amber-400 animate-pulse
            let cardBorder = 'border-slate-800 hover:border-slate-600 bg-slate-950/60';
            if (completed) {
              cardBorder = 'border-emerald-500 shadow-emerald-500/30 bg-emerald-950/30 border-2';
            } else if (active) {
              cardBorder = 'border-amber-400 animate-pulse shadow-lg shadow-amber-400/20 border-2 bg-amber-950/20';
            }

            return (
              <div
                key={char.name}
                className={`relative group rounded-xl border p-2 flex flex-col items-center justify-between transition-all duration-200 ${cardBorder}`}
                title={`${char.name}${completed ? ' (Completed)' : active ? ' (Active Target)' : ''}`}
              >
                {/* Checkmark badge for completed */}
                {completed && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 p-1 rounded-full shadow-md z-10">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {/* Active badge */}
                {active && (
                  <div className="absolute -top-2 -left-2 bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full text-[9px] font-black z-10 uppercase tracking-tighter">
                    Target
                  </div>
                )}

                {/* Checkpoint indicator */}
                {checkpoint && !completed && !active && (
                  <div className="absolute -top-2 -right-2 bg-indigo-500 text-white p-1 rounded-full shadow-md z-10">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                )}

                {/* Avatar Portrait */}
                <div className="w-full aspect-square rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center relative mb-2">
                  {avatarUrl && !hasError ? (
                    <img
                      src={avatarUrl}
                      alt={char.name}
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        completed ? 'brightness-110' : !active ? 'opacity-80' : ''
                      }`}
                      onError={() => handleImageError(char.name)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      {role === 'survivor' ? (
                        <User className="w-8 h-8" />
                      ) : (
                        <Skull className="w-8 h-8" />
                      )}
                    </div>
                  )}
                </div>

                {/* Name Label */}
                <span className="text-[11px] font-semibold text-center text-slate-200 line-clamp-1 w-full group-hover:text-amber-300 transition-colors">
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
