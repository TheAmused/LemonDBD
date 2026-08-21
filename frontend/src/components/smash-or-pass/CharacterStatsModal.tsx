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
import { EntityItem, EntityMetadata } from '@/types/smashOrPass';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

export interface CharacterStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: EntityItem | any | null;
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
  dict,
}) => {
  const backendBase = getBackendBaseUrl();

  const slug = rawCharacter?.slug || rawCharacter?.character_slug || rawCharacter?.id || '';

  const meta: EntityMetadata = useMemo(
    () => ({
      ...(rawCharacter?.metadata_json || {}),
      ...(rawCharacter?.metadata || {}),
    }),
    [rawCharacter]
  );

  const name = rawCharacter?.name || rawCharacter?.character_name || 'Candidate';
  const role = rawCharacter?.role || 'Survivor';
  const title = meta.title || meta.archetype || rawCharacter?.title || role;
  const bio = meta.bio || meta.backstory || rawCharacter?.bio || 'A formidable candidate in the Fog.';
  const quote = meta.lore_quote || meta.quote || rawCharacter?.quote || `"${name}"`;
  const greenFlags: string[] = meta.green_flags || meta.greenFlags || rawCharacter?.greenFlags || ['Loyal trial companion'];
  const redFlags: string[] = meta.red_flags || meta.redFlags || rawCharacter?.redFlags || ['Unpredictable in the fog'];
  const turnOn = meta.turn_on || meta.turnOn || rawCharacter?.turnOn || 'Courage and loyalty under pressure';
  const dealbreaker = meta.dealbreaker || rawCharacter?.dealbreaker || 'Betrayal of trust';
  const isSurvivor = role === 'Survivor';

  const avatarSrc =
    rawCharacter?.media_url?.startsWith('http') || rawCharacter?.media_url?.startsWith('/static')
      ? `${rawCharacter.media_url.startsWith('http') ? '' : backendBase}${rawCharacter.media_url}`
      : resolveAvatarUrl(
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
        tier: dict?.smashOrPass?.tiers?.godTier || 'God Tier',
        color: 'text-[#ffd166]',
        bg: 'bg-[#ffd166]/15 border-[#ffd166]/40',
        glow: 'shadow-[0_0_20px_rgba(255,209,102,0.35)]',
        icon: <Sparkles className="h-4 w-4 text-[#ffd166]" />,
      };
    }
    if (smashRate >= 65) {
      return {
        tier: dict?.smashOrPass?.tiers?.fatalAttraction || 'Fatal Attraction',
        color: 'text-[#ff0055]',
        bg: 'bg-[#ff0055]/15 border-[#ff0055]/40',
        glow: 'shadow-[0_0_20px_rgba(255,0,85,0.35)]',
        icon: <Flame className="h-4 w-4 text-[#ff0055]" />,
      };
    }
    if (smashRate >= 40) {
      return {
        tier: dict?.smashOrPass?.tiers?.friendzone || 'Friendzone',
        color: 'text-[#00f5d4]',
        bg: 'bg-[#00f5d4]/15 border-[#00f5d4]/40',
        glow: 'shadow-[0_0_20px_rgba(0,245,212,0.35)]',
        icon: <Shield className="h-4 w-4 text-[#00f5d4]" />,
      };
    }
    return {
      tier: dict?.smashOrPass?.tiers?.eldritchVoid || 'Eldritch Void',
      color: 'text-purple-400',
      bg: 'bg-purple-950/40 border-purple-500/40',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
      icon: <Skull className="h-4 w-4 text-purple-400" />,
    };
  }, [smashRate, dict]);

  if (!isOpen || !rawCharacter) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#09090b]/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl border border-[#ff0055]/40 bg-[#09090b] shadow-2xl shadow-rose-950/40 text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5 bg-gradient-to-r from-[#09090b] via-zinc-900 to-rose-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
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
            <div>
              <div className="flex items-center gap-2">
                <h2 id="stats-modal-title" className="text-base sm:text-lg font-black font-mono tracking-tight text-white">
                  {name}
                </h2>
                <span
                  className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded border ${
                    isSurvivor
                      ? 'bg-[#00f5d4]/10 text-[#00f5d4] border-[#00f5d4]/30'
                      : 'bg-[#ff0055]/10 text-[#ff0055] border-[#ff0055]/30'
                  }`}
                >
                  {role}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono italic line-clamp-1">{title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Dossier Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Consensus Tier Badge & Global Smash Rate Bar */}
          <div className={`p-4 rounded-2xl border ${tierInfo.bg} ${tierInfo.glow} flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 border border-white/10">
                {tierInfo.icon}
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 block">
                  Community Consensus
                </span>
                <span className={`text-sm font-black font-mono ${tierInfo.color}`}>
                  {tierInfo.tier}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-400 block">Smash Rate</span>
              <span className="text-xl font-black font-mono text-[#ff0055] flex items-center gap-1 justify-end">
                <Heart className="h-4 w-4 fill-[#ff0055]" /> {smashRate}%
              </span>
            </div>
          </div>

          {/* 2. Vote Breakdown Progress Bar */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 font-mono">
            <div className="flex justify-between text-xs font-bold">
              <span className="flex items-center gap-1 text-[#ff0055]">
                <Heart className="h-3.5 w-3.5 fill-[#ff0055]" /> {smashCount.toLocaleString()} Smashes ({smashPct}%)
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <ThumbsDown className="h-3.5 w-3.5" /> {passCount.toLocaleString()} Passes ({passPct}%)
              </span>
            </div>
            <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${smashPct}%` }}
                className="h-full bg-gradient-to-r from-rose-600 to-[#ff0055] transition-all duration-500"
              />
              <div
                style={{ width: `${passPct}%` }}
                className="h-full bg-zinc-700 transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
              <span>Total Votes: {totalVotes.toLocaleString()}</span>
              {stats?.rank && <span>Global Rank: #{stats.rank}</span>}
            </div>
          </div>

          {/* 3. Lore Quote */}
          {quote && (
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-1">
              <div className="flex items-center gap-1 text-amber-400 text-[10px] font-mono uppercase font-bold">
                <Quote className="h-3.5 w-3.5" />
                <span>Lore Quote</span>
              </div>
              <p className="text-xs text-amber-100/90 font-serif italic leading-relaxed">
                {quote}
              </p>
            </div>
          )}

          {/* 4. Bio & Lore Profile */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-zinc-400">
              Candidate Lore &amp; Personality
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800">
              {bio}
            </p>
          </div>

          {/* 5. Green & Red Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5 bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-2xl">
              <span className="flex items-center gap-1.5 font-black text-emerald-400 font-mono text-[11px] uppercase">
                <CheckCircle2 className="h-3.5 w-3.5" /> Green Flags
              </span>
              <ul className="text-xs text-emerald-200/90 space-y-1 pl-4 list-disc">
                {greenFlags.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5 bg-rose-950/30 border border-rose-500/20 p-3 rounded-2xl">
              <span className="flex items-center gap-1.5 font-black text-rose-400 font-mono text-[11px] uppercase">
                <AlertTriangle className="h-3.5 w-3.5" /> Red Flags
              </span>
              <ul className="text-xs text-rose-200/90 space-y-1 pl-4 list-disc">
                {redFlags.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 6. Turn On & Dealbreaker */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-2xl space-y-0.5">
              <span className="font-bold text-[#ff0055] uppercase text-[10px] block">Turn On:</span>
              <p className="text-zinc-300 text-[11px] leading-tight">{turnOn}</p>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-2xl space-y-0.5">
              <span className="font-bold text-[#ffd166] uppercase text-[10px] block">Dealbreaker:</span>
              <p className="text-zinc-300 text-[11px] leading-tight">{dealbreaker}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-zinc-800 p-3 sm:px-5 bg-zinc-950/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors cursor-pointer font-mono"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
