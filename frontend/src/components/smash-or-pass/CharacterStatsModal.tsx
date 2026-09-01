'use client';
// frontend/src/components/smash-or-pass/CharacterStatsModal.tsx

import React, { useMemo } from 'react';
import {
  Heart,
  Flame,
  Shield,
  Skull,
  Sparkles,
  Quote,
  CheckCircle2,
  AlertTriangle,
  ThumbsDown,
} from 'lucide-react';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { EntityMetadata, EntityStatItem } from '@/types/smashOrPass';
import { Modal } from '@/components/common/Modal';
import type { Dictionary } from '@/locales/types';

interface CharacterStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: any;
  stats?: EntityStatItem;
  locale?: string;
  dict?: Dictionary | any;
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
  const rawSmashDict = dict?.smashOrPass;

  const slug = rawCharacter?.slug || rawCharacter?.character_slug || rawCharacter?.id || '';

  const meta: EntityMetadata = useMemo(
    () => ({
      ...(rawCharacter?.metadata_json || {}),
      ...(rawCharacter?.metadata || {}),
    }),
    [rawCharacter]
  );

  const currentLoc = locale || 'en';
  const locMeta = (meta.translations as any)?.[currentLoc] || (meta.i18n as any)?.[currentLoc] || {};

  const name = rawCharacter?.name || rawCharacter?.character_name || 'Candidate';
  const role = rawCharacter?.role || 'Survivor';
  const isSurvivor = role === 'Survivor';
  const title =
    locMeta.title ||
    meta.title ||
    meta.archetype ||
    locMeta.tagline ||
    meta.tagline ||
    role;

  const bio = locMeta.bio || meta.bio || locMeta.description || meta.description || '';
  const quote = locMeta.quote || meta.quote || locMeta.lore_quote || meta.lore_quote || '';
  const greenFlags = locMeta.green_flags || meta.green_flags || (meta as any).greenFlags || [];
  const redFlags = locMeta.red_flags || meta.red_flags || (meta as any).redFlags || [];
  const turnOn = locMeta.turn_on || meta.turn_on || (meta as any).turnOn || '';
  const dealbreaker = locMeta.dealbreaker || meta.dealbreaker || '';

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

  const totalVotes = stats?.total_votes ?? rawCharacter?.total_votes ?? 0;
  const smashCount = stats?.smash_count ?? rawCharacter?.smash_count ?? 0;
  const passCount = stats?.pass_count ?? rawCharacter?.pass_count ?? 0;
  const smashRate = stats?.smash_rate ?? rawCharacter?.smash_rate ?? 0;

  const smashPct = totalVotes > 0 ? Math.round((smashCount / totalVotes) * 100) : 50;
  const passPct = 100 - smashPct;

  const tierInfo = useMemo(() => {
    if (smashRate >= 85) {
      return {
        tier: rawSmashDict?.tiers?.godTier || 'God Tier',
        color: 'text-[#ffd166]',
        bg: 'bg-[#ffd166]/15 border-[#ffd166]/40',
        glow: 'shadow-[0_0_20px_rgba(255,209,102,0.35)]',
        icon: <Sparkles className="h-4 w-4 text-[#ffd166]" />,
      };
    }
    if (smashRate >= 65) {
      return {
        tier: rawSmashDict?.tiers?.fatalAttraction || 'Fatal Attraction',
        color: 'text-[#ff0055]',
        bg: 'bg-[#ff0055]/15 border-[#ff0055]/40',
        glow: 'shadow-[0_0_20px_rgba(255,0,85,0.35)]',
        icon: <Flame className="h-4 w-4 text-[#ff0055]" />,
      };
    }
    if (smashRate >= 40) {
      return {
        tier: rawSmashDict?.tiers?.friendzone || 'Friendzone',
        color: 'text-[#00f5d4]',
        bg: 'bg-[#00f5d4]/15 border-[#00f5d4]/40',
        glow: 'shadow-[0_0_20px_rgba(0,245,212,0.35)]',
        icon: <Shield className="h-4 w-4 text-[#00f5d4]" />,
      };
    }
    return {
      tier: rawSmashDict?.tiers?.eldritchVoid || 'Eldritch Void',
      color: 'text-purple-400',
      bg: 'bg-purple-950/40 border-purple-500/40',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
      icon: <Skull className="h-4 w-4 text-purple-400" />,
    };
  }, [smashRate, rawSmashDict]);

  const roleLabel = isSurvivor
    ? rawSmashDict?.filters?.survivors || 'Survivor'
    : rawSmashDict?.filters?.killers || 'Killer';

  const communityConsensusLabel = rawSmashDict?.communityConsensus || 'Community Consensus';
  const smashRateLabel = rawSmashDict?.statsDetail?.communitySmashRate || rawSmashDict?.statsDetail?.smashRate || 'Smash Rate';
  const smashesLabel = rawSmashDict?.statsDetail?.smashCount || 'Smashes';
  const passesLabel = rawSmashDict?.statsDetail?.passCount || 'Passes';
  const totalVotesLabel = rawSmashDict?.statsDetail?.totalVotes || 'Total Votes';
  const globalRankLabel = rawSmashDict?.statsDetail?.rank || 'Global Rank';
  const loreQuoteLabel = rawSmashDict?.loreLabels?.signatureQuote || 'Signature Quote';
  const loreProfileLabel = rawSmashDict?.loreLabels?.bio || 'Bio';
  const greenFlagsLabel = rawSmashDict?.loreLabels?.greenFlag || 'Green Flags';
  const redFlagsLabel = rawSmashDict?.loreLabels?.redFlag || 'Red Flags';
  const turnOnLabel = rawSmashDict?.loreLabels?.turn_on || 'Turn On:';
  const dealbreakerLabel = rawSmashDict?.loreLabels?.dealbreaker || 'Dealbreaker:';
  const percentSign = rawSmashDict?.percentSign || '%';

  const roleBadge = (
    <span
      className={`text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-lg border ${
        isSurvivor
          ? 'bg-[#00f5d4]/15 text-[#00f5d4] border-[#00f5d4]/40 shadow-[0_0_8px_rgba(0,245,212,0.25)]'
          : 'bg-[#ff0055]/15 text-pink-300 border-[#ff0055]/40 shadow-[0_0_8px_rgba(255,0,85,0.25)]'
      }`}
    >
      {roleLabel}
    </span>
  );

  const headerAvatar = (
    <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl overflow-hidden border border-pink-500/40 shrink-0 bg-black shadow-md">
      <img
        src={avatarSrc}
        alt={name}
        className="h-full w-full object-cover object-top"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `${backendBase}/static/avatars/survivors/sable_ward.png`;
        }}
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={name}
      icon={headerAvatar}
      badge={roleBadge}
      centerTitle={true}
      className="h-[88vh] max-h-[850px] min-h-[480px]"
      bodyClassName="flex flex-col"
    >
      {/* Scrollable Dossier Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
        {/* 1. Consensus Tier Badge & Global Smash Rate Bar */}
        <div className={`p-4 rounded-2xl border ${tierInfo.bg} ${tierInfo.glow} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 border border-white/10">
              {tierInfo.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block font-mono">
                {communityConsensusLabel}
              </span>
              <span className={`text-sm font-black font-mono ${tierInfo.color}`}>
                {tierInfo.tier}
              </span>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-zinc-400 block">{smashRateLabel}</span>
            <span className="text-xl font-black text-[#ff0055] flex items-center gap-1 justify-end">
              <Heart className="h-4 w-4 fill-[#ff0055]" /> {smashRate}{percentSign}
            </span>
          </div>
        </div>

        {/* 2. Vote Breakdown Progress Bar */}
        <div className="space-y-1.5 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 font-mono">
          <div className="flex justify-between text-xs font-bold">
            <span className="flex items-center gap-1 text-[#ff0055]">
              <Heart className="h-3.5 w-3.5 fill-[#ff0055]" /> {smashCount.toLocaleString()} {smashesLabel} ({smashPct}{percentSign})
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <ThumbsDown className="h-3.5 w-3.5" /> {passCount.toLocaleString()} {passesLabel} ({passPct}{percentSign})
            </span>
          </div>
          <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
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
            <span>{totalVotesLabel}: {totalVotes.toLocaleString()}</span>
            {stats?.rank && <span>{globalRankLabel}: #{stats.rank}</span>}
          </div>
        </div>

        {/* 3. Lore Quote */}
        {quote && (
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1 text-amber-400 text-[10px] uppercase font-bold font-mono">
              <Quote className="h-3.5 w-3.5" />
              <span>{loreQuoteLabel}</span>
            </div>
            <p className="text-xs text-amber-100/90 font-serif italic leading-relaxed">
              {quote}
            </p>
          </div>
        )}

        {/* 4. Bio Profile */}
        {bio && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              {loreProfileLabel}
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800 font-sans">
              {bio}
            </p>
          </div>
        )}

        {/* 5. Green & Red Flags */}
        {(greenFlags.length > 0 || redFlags.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {greenFlags.length > 0 && (
              <div className="space-y-1.5 bg-emerald-950/30 border border-emerald-500/20 p-3 rounded-2xl">
                <span className="flex items-center gap-1.5 font-black text-emerald-400 text-[11px] uppercase font-mono">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {greenFlagsLabel}
                </span>
                <ul className="text-xs text-emerald-200/90 space-y-1 pl-4 list-disc font-sans">
                  {greenFlags.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {redFlags.length > 0 && (
              <div className="space-y-1.5 bg-rose-950/30 border border-rose-500/20 p-3 rounded-2xl">
                <span className="flex items-center gap-1.5 font-black text-rose-400 text-[11px] uppercase font-mono">
                  <AlertTriangle className="h-3.5 w-3.5" /> {redFlagsLabel}
                </span>
                <ul className="text-xs text-rose-200/90 space-y-1 pl-4 list-disc font-sans">
                  {redFlags.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 6. Turn On & Dealbreaker */}
        {(turnOn || dealbreaker) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            {turnOn && (
              <div className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-2xl space-y-0.5">
                <span className="font-bold text-[#ff0055] uppercase text-[10px] block">{turnOnLabel}</span>
                <p className="text-zinc-300 text-[11px] leading-tight font-sans">{turnOn}</p>
              </div>
            )}
            {dealbreaker && (
              <div className="bg-zinc-950/70 border border-zinc-800 p-2.5 rounded-2xl space-y-0.5">
                <span className="font-bold text-[#ffd166] uppercase text-[10px] block">{dealbreakerLabel}</span>
                <p className="text-zinc-300 text-[11px] leading-tight font-sans">{dealbreaker}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
