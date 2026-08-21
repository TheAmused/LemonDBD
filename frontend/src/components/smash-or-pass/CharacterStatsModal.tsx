// frontend/src/components/smash-or-pass/CharacterStatsModal.tsx
'use client';

import React, { useMemo } from 'react';
import {
  X,
  Heart,
  ThumbsDown,
  Flame,
  Skull,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Quote,
} from 'lucide-react';
import { CharacterRosterItem } from './characterRoster';
import { getLocalizedCharacterRoster } from './rosterTranslations';
import { EntityItem, EntityMetadata } from '@/types/smashOrPass';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

export interface CharacterStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterRosterItem | EntityItem | any | null;
  stats?: {
    smash_count?: number;
    pass_count?: number;
    total_votes?: number;
    smash_rate?: number;
    rank?: number;
    [key: string]: any;
  } | null;
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
  const backendBase = getBackendBaseUrl();

  const slug = rawCharacter?.slug || rawCharacter?.character_slug || rawCharacter?.id || '';
  const localized = slug ? getLocalizedCharacterRoster(slug, locale) : null;

  const meta: EntityMetadata = useMemo(
    () => ({
      ...((localized as any)?.metadata || {}),
      ...(rawCharacter?.metadata_json || {}),
      ...(rawCharacter?.metadata || {}),
    }),
    [localized, rawCharacter]
  );

  const name = rawCharacter?.name || rawCharacter?.character_name || localized?.name || 'Candidate';
  const role = rawCharacter?.role || localized?.role || 'Survivor';
  const title = meta.title || rawCharacter?.title || localized?.title || 'Trial Candidate';
  const bio = meta.backstory || rawCharacter?.bio || localized?.bio || '';
  const quote = meta.lore_quote || meta.quote || rawCharacter?.quote || localized?.quote || '';
  const greenFlags: string[] = rawCharacter?.greenFlags || meta.compatibility_tags || localized?.greenFlags || [];
  const redFlags: string[] = rawCharacter?.redFlags || localized?.redFlags || [];
  const turnOn = rawCharacter?.turnOn || localized?.turnOn || '';
  const dealbreaker = rawCharacter?.dealbreaker || localized?.dealbreaker || '';
  const isSurvivor = role === 'Survivor';

  const avatarSrc =
    rawCharacter?.media_url ||
    resolveAvatarUrl(
      backendBase,
      {
        name,
        category: role,
        avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${slug}.png`,
      },
      isSurvivor
    );

  // Community Votes calculation
  const smashCount = stats?.smash_count ?? 0;
  const passCount = stats?.pass_count ?? 0;
  const totalVotes = stats?.total_votes ?? (smashCount + passCount);
  const effectiveTotal = totalVotes > 0 ? totalVotes : 1;
  const smashRate =
    stats?.smash_rate !== undefined
      ? stats.smash_rate
      : totalVotes > 0
      ? Math.round((smashCount / totalVotes) * 1000) / 10
      : 50;

  const smashPct = Math.round((smashCount / effectiveTotal) * 100);
  const passPct = Math.max(0, 100 - smashPct);

  // Dynamic Consensus Rating Tiers (God Tier, Fatal Attraction, Friendzone, Eldritch Void)
  const tierInfo = useMemo(() => {
    if (smashRate >= 85) {
      return {
        name: dict?.smashOrPass?.tiers?.godTier || 'God Tier',
        theme: 'border-[#ffd166]/50 bg-[#ffd166]/15 text-[#ffd166] shadow-[0_0_15px_rgba(255,209,102,0.4)]',
        icon: <Sparkles className="h-3.5 w-3.5 text-[#ffd166]" />,
        desc: 'Undisputed community icon and top pick across the Fog.',
      };
    }
    if (smashRate >= 65) {
      return {
        name: dict?.smashOrPass?.tiers?.fatalAttraction || 'Fatal Attraction',
        theme: 'border-[#ff0055]/50 bg-[#ff0055]/15 text-[#ff0055] shadow-[0_0_15px_rgba(255,0,85,0.4)]',
        icon: <Flame className="h-3.5 w-3.5 text-[#ff0055]" />,
        desc: 'High community passion with intense attraction rating.',
      };
    }
    if (smashRate >= 40) {
      return {
        name: dict?.smashOrPass?.tiers?.friendzone || 'Friendzone',
        theme: 'border-[#00f5d4]/50 bg-[#00f5d4]/15 text-[#00f5d4] shadow-[0_0_15px_rgba(0,245,212,0.4)]',
        icon: <Shield className="h-3.5 w-3.5 text-[#00f5d4]" />,
        desc: 'Solid companion aura and dependable campfire ally.',
      };
    }
    return {
      name: dict?.smashOrPass?.tiers?.eldritchVoid || 'Eldritch Void',
      theme: 'border-purple-500/50 bg-purple-950/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]',
      icon: <Skull className="h-3.5 w-3.5 text-purple-300" />,
      desc: 'Rare resonance with mysterious and isolating trial aura.',
    };
  }, [smashRate, dict]);

  if (!isOpen || !rawCharacter) return null;

  // Localized Strings
  const modalTitle = dict?.smashOrPass?.modals?.statsTitle || dict?.smashOrPass?.stats || 'Candidate Dossier';
  const smashLabel = dict?.smashOrPass?.smash || 'Smash';
  const passLabel = dict?.smashOrPass?.pass || 'Pass';
  const communityRateLabel = dict?.smashOrPass?.communitySmashRate || 'Community Smash Rate';
  const traitsLabel = dict?.smashOrPass?.traits || 'Compatibility Traits';
  const closeLabel = dict?.smashOrPass?.close || 'Close Dossier';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-stats-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#09090b]/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div onClick={onClose} className="fixed inset-0" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl border border-[#ff0055]/30 bg-[#09090b] shadow-2xl shadow-rose-950/40 flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header with Mini-Hero */}
        <div className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-[#09090b] via-zinc-950 to-rose-950/20 p-4 sm:p-6 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative h-16 w-16 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-2xl border-2 border-[#ff0055]/40 bg-zinc-950 shadow-md">
                <img
                  src={avatarSrc}
                  alt={name}
                  className="h-full w-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                  }}
                />
              </div>

              <div className="space-y-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 id="character-stats-title" className="text-lg sm:text-xl font-black text-zinc-100 font-mono truncate">
                    {name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono border ${
                      isSurvivor
                        ? 'border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[#00f5d4]'
                        : 'border-[#ff0055]/40 bg-[#ff0055]/10 text-[#ff0055]'
                    }`}
                  >
                    {isSurvivor ? <Shield className="h-3 w-3" /> : <Skull className="h-3 w-3" />}
                    <span>{role}</span>
                  </span>
                </div>

                <p className="text-xs text-rose-300 font-semibold italic truncate">{title}</p>

                {/* Consensus Tier Badge */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 text-[11px] font-mono font-black border ${tierInfo.theme}`}>
                    {tierInfo.icon}
                    <span>{tierInfo.name}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body Stats Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-left">
          {/* Main Smash Rate Card */}
          <div className="flex items-center justify-between rounded-2xl bg-zinc-950/80 border border-[#ff0055]/30 p-4 shadow-inner">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                {communityRateLabel}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-[#ff0055]">{smashRate}%</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">{tierInfo.desc}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff0055]/15 border border-[#ff0055]/30 text-[#ff0055] shrink-0">
              <Heart className="h-6 w-6 fill-[#ff0055] animate-pulse" />
            </div>
          </div>

          {/* Ratio Progress Bar */}
          <div className="space-y-2 bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
            <div className="flex justify-between text-[11px] font-mono font-bold">
              <span className="text-[#ff0055] flex items-center gap-1">
                <Heart className="h-3 w-3 fill-[#ff0055]" /> {smashLabel} ({smashPct}%)
              </span>
              <span className="text-zinc-400 flex items-center gap-1">
                <ThumbsDown className="h-3 w-3" /> {passLabel} ({passPct}%)
              </span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-950 border border-zinc-800 flex shadow-inner">
              <div style={{ width: `${smashPct}%` }} className="bg-[#ff0055] shadow-[0_0_10px_rgba(255,0,85,0.6)] transition-all duration-500" />
              <div style={{ width: `${passPct}%` }} className="bg-zinc-700 transition-all duration-500" />
            </div>
          </div>

          {/* Detailed Counts Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800 p-2.5 space-y-0.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#ff0055] block truncate">
                {smashLabel}
              </span>
              <p className="text-base font-black font-mono text-zinc-100">{smashCount.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800 p-2.5 space-y-0.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#00f5d4] block truncate">
                {passLabel}
              </span>
              <p className="text-base font-black font-mono text-zinc-100">{passCount.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800 p-2.5 space-y-0.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400 block truncate">
                {dict?.smashOrPass?.totalVotes || 'Total'}
              </span>
              <p className="text-base font-black font-mono text-zinc-100">{totalVotes.toLocaleString()}</p>
            </div>
          </div>

          {/* Trait Tags & Compatibility */}
          {(greenFlags.length > 0 || redFlags.length > 0) && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                {traitsLabel}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {greenFlags.map((flag, idx) => (
                  <span
                    key={`gf-${idx}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium border border-[#00f5d4]/40 bg-[#00f5d4]/10 text-[#00f5d4]"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{flag}</span>
                  </span>
                ))}
                {redFlags.map((flag, idx) => (
                  <span
                    key={`rf-${idx}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium border border-[#ff0055]/40 bg-[#ff0055]/10 text-[#ff0055]"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>{flag}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Turn On & Dealbreaker */}
          {(turnOn || dealbreaker) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {turnOn && (
                <div className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-2xl space-y-0.5">
                  <span className="font-bold text-pink-400 uppercase text-[10px]">Turn On:</span>
                  <p className="text-zinc-300 font-medium text-[11px] leading-tight">{turnOn}</p>
                </div>
              )}
              {dealbreaker && (
                <div className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-2xl space-y-0.5">
                  <span className="font-bold text-amber-400 uppercase text-[10px]">Dealbreaker:</span>
                  <p className="text-zinc-300 font-medium text-[11px] leading-tight">{dealbreaker}</p>
                </div>
              )}
            </div>
          )}

          {/* Lore / Backstory & Full Quote */}
          {bio && (
            <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800 p-3.5 space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                Lore Background
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">{bio}</p>
            </div>
          )}

          {quote && (
            <div className="rounded-2xl border-l-4 border-[#ff0055] bg-zinc-950/80 p-3 text-xs italic text-zinc-300 font-serif flex items-start gap-2">
              <Quote className="h-4 w-4 text-[#ffd166] shrink-0 mt-0.5" />
              <span>&ldquo;{quote}&rdquo;</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
