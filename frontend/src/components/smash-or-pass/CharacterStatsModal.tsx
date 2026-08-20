// frontend/src/components/smash-or-pass/CharacterStatsModal.tsx
'use client';

import React from 'react';
import {
  X,
  Heart,
  Flame,
  Skull,
  Trophy,
  Shield,
  BarChart3,
  TrendingUp,
  Percent,
  Sparkles,
} from 'lucide-react';
import { CharacterRosterItem } from './characterRoster';
import { getLocalizedCharacterRoster } from './rosterTranslations';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

interface CharacterStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterRosterItem | null;
  stats?: {
    smash_count: number;
    pass_count: number;
    super_smash_count: number;
    total_votes: number;
    smash_rate: number;
    rank?: number;
  };
  locale?: string;
  dict?: any;
}

export const CharacterStatsModal: React.FC<CharacterStatsModalProps> = ({
  isOpen,
  onClose,
  character: rawCharacter,
  stats,
  locale = 'en',
  dict,
}) => {
  if (!isOpen || !rawCharacter) return null;

  const character = getLocalizedCharacterRoster(rawCharacter.slug, locale);
  const backendBase = getBackendBaseUrl();
  const isSurvivor = character.role === 'Survivor';

  const avatarSrc = resolveAvatarUrl(
    backendBase,
    {
      name: character.name,
      category: character.role,
      avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${character.slug}.png`,
    },
    isSurvivor
  );

  const total = stats?.total_votes || 1;
  const smashCount = stats?.smash_count || 0;
  const passCount = stats?.pass_count || 0;
  const superSmashCount = stats?.super_smash_count || 0;
  const smashRate = stats?.smash_rate || 50;

  const smashPct = Math.round((smashCount / total) * 100);
  const passPct = Math.round((passCount / total) * 100);
  const superPct = Math.round((superSmashCount / total) * 100);

  // Desirability Tier
  let tierBadge = 'S-Tier Entity Crush';
  let tierColor = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  if (smashRate >= 90) {
    tierBadge = 'S+ Transcendent Heartthrob';
    tierColor = 'text-pink-300 border-pink-500/50 bg-pink-500/20';
  } else if (smashRate >= 75) {
    tierBadge = 'A-Tier Trial Favorite';
    tierColor = 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10';
  } else if (smashRate >= 55) {
    tierBadge = 'B-Tier Charming Survivor';
    tierColor = 'text-amber-300 border-amber-500/40 bg-amber-500/10';
  } else {
    tierBadge = 'C-Tier Underdog Lover';
    tierColor = 'text-slate-300 border-slate-700 bg-slate-800/40';
  }

  const smashLabel = dict?.smashOrPass?.smash || 'Smash';
  const passLabel = dict?.smashOrPass?.pass || 'Pass';
  const superSmashLabel = dict?.smashOrPass?.superSmash || 'Super Smash';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-stats-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-pink-500/30 bg-slate-900 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
      >
        {/* Header with Character Mini-Hero */}
        <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-rose-950/20 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-pink-500/40 bg-slate-950 shadow-md">
                <img src={avatarSrc} alt={character.name} className="h-full w-full object-cover object-top" />
              </div>
              <div className="space-y-0.5">
                <h3 id="character-stats-title" className="text-xl font-black text-slate-100">
                  {character.name}
                </h3>
                <p className="text-xs text-rose-400 font-semibold">{character.title}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${tierColor}`}>
                    <Sparkles className="h-3 w-3" />
                    {tierBadge}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body Stats Content */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Main Smash Rate Metric */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-950/80 border border-pink-500/20 p-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Community Smash Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-400">{smashRate}%</span>
                <span className="text-xs text-slate-400 font-medium">positive flirtation</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Heart className="h-6 w-6 fill-rose-400 animate-pulse" />
            </div>
          </div>

          {/* Ratio Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-rose-400 flex items-center gap-1">
                <Heart className="h-3 w-3 fill-rose-400" /> {smashLabel} ({smashPct}%)
              </span>
              <span className="text-amber-400 flex items-center gap-1">
                <Flame className="h-3 w-3 fill-amber-400" /> {superSmashLabel} ({superPct}%)
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <Skull className="h-3 w-3" /> {passLabel} ({passPct}%)
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800 flex">
              <div style={{ width: `${smashPct}%` }} className="bg-rose-500 transition-all duration-500" />
              <div style={{ width: `${superPct}%` }} className="bg-amber-400 transition-all duration-500" />
              <div style={{ width: `${passPct}%` }} className="bg-slate-700 transition-all duration-500" />
            </div>
          </div>

          {/* Detailed Counts Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">{smashLabel}</span>
              <p className="text-lg font-black text-slate-100">{smashCount.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{superSmashLabel}</span>
              <p className="text-lg font-black text-slate-100">{superSmashCount.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{passLabel}</span>
              <p className="text-lg font-black text-slate-100">{passCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Lore / Quote Highlight */}
          {character.quote && (
            <div className="rounded-2xl border-l-4 border-rose-500 bg-slate-950/80 p-3 text-xs italic text-slate-300 font-serif">
              {character.quote}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            Close Stats
          </button>
        </div>
      </div>
    </div>
  );
};
