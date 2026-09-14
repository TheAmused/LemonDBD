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
import { EntityStatItem } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
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

  // Was a merge of `metadata_json` under `metadata`: the API used to send the same dict
  // twice per entity. There is one dict now, and localizedProfile resolves the locale.
  const currentLoc = locale || 'en';
  const profile = useMemo(
    () => localizedProfile(rawCharacter?.metadata, currentLoc),
    [rawCharacter, currentLoc]
  );

  const name = rawCharacter?.name || rawCharacter?.character_name || 'Candidate';
  const role = rawCharacter?.role || 'Survivor';
  const isSurvivor = role === 'Survivor';
  // The old `title` chain (locMeta.title || meta.title || meta.archetype || ...tagline) is
  // dropped entirely: it was never rendered here — the modal header shows `name`.

  const bio = profile.bio;
  const quote = profile.quote;
  const dealbreaker = profile.dealbreaker;

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
        color: 'text-accent-amber',
        bg: 'bg-accent-amber/15 border-accent-amber/40',
        glow: '',
        icon: <Sparkles className="h-4 w-4 text-accent-amber" />,
      };
    }
    if (smashRate >= 65) {
      return {
        tier: rawSmashDict?.tiers?.fatalAttraction || 'Fatal Attraction',
        color: 'text-accent-red',
        bg: 'bg-accent-red/15 border-accent-red/40',
        glow: '',
        icon: <Flame className="h-4 w-4 text-accent-red" />,
      };
    }
    if (smashRate >= 40) {
      return {
        tier: rawSmashDict?.tiers?.friendzone || 'Friendzone',
        color: 'text-text-secondary',
        bg: 'bg-bg-elevated border-border-color',
        glow: '',
        icon: <Shield className="h-4 w-4 text-text-secondary" />,
      };
    }
    return {
      tier: rawSmashDict?.tiers?.eldritchVoid || 'Eldritch Void',
      color: 'text-text-muted',
      bg: 'bg-bg-elevated border-border-color',
      glow: '',
      icon: <Skull className="h-4 w-4 text-text-muted" />,
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
          ? 'bg-accent-green/15 text-accent-green border-accent-green/40'
          : 'bg-accent-red/15 text-accent-red border-accent-red/40'
      }`}
    >
      {roleLabel}
    </span>
  );

  const headerAvatar = (
    <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl overflow-hidden border border-accent-red/40 shrink-0 bg-bg-primary shadow-md">
      <img
        src={avatarSrc}
        alt={name}
        className="h-full w-full object-cover object-top"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `${backendBase}/static/avatars/survivors/sable_ward.webp`;
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-primary/40 border border-border-color">
              {tierInfo.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted block font-mono">
                {communityConsensusLabel}
              </span>
              <span className={`text-sm font-black font-mono ${tierInfo.color}`}>
                {tierInfo.tier}
              </span>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-text-muted block">{smashRateLabel}</span>
            <span className="text-xl font-black text-accent-red flex items-center gap-1 justify-end">
              <Heart className="h-4 w-4 fill-accent-red" /> {smashRate}{percentSign}
            </span>
          </div>
        </div>

        {/* 2. Vote Breakdown Progress Bar */}
        <div className="space-y-1.5 p-3.5 rounded-2xl bg-bg-elevated border border-border-color font-mono">
          <div className="flex justify-between text-xs font-bold">
            <span className="flex items-center gap-1 text-accent-red">
              <Heart className="h-3.5 w-3.5 fill-accent-red" /> {smashCount.toLocaleString()} {smashesLabel} ({smashPct}{percentSign})
            </span>
            <span className="flex items-center gap-1 text-text-muted">
              <ThumbsDown className="h-3.5 w-3.5" /> {passCount.toLocaleString()} {passesLabel} ({passPct}{percentSign})
            </span>
          </div>
          <div className="h-3 w-full bg-bg-elevated rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${smashPct}%` }}
              className="h-full bg-accent-red transition-all duration-500"
            />
            <div
              style={{ width: `${passPct}%` }}
              className="h-full bg-border-color transition-all duration-500"
            />
          </div>
          <div className="flex justify-between text-[10px] text-text-muted pt-1">
            <span>{totalVotesLabel}: {totalVotes.toLocaleString()}</span>
            {stats?.rank && <span>{globalRankLabel}: #{stats.rank}</span>}
          </div>
        </div>

        {/* 3. Lore Quote */}
        {quote && (
          <div className="p-3.5 rounded-2xl bg-bg-elevated border border-border-color space-y-1">
            <div className="flex items-center gap-1 text-accent-amber text-[10px] uppercase font-bold font-mono">
              <Quote className="h-3.5 w-3.5" />
              <span>{loreQuoteLabel}</span>
            </div>
            <p className="text-xs text-text-secondary font-serif italic leading-relaxed">
              {quote}
            </p>
          </div>
        )}

        {/* 4. Bio Profile */}
        {bio && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
              {loreProfileLabel}
            </span>
            <p className="text-xs text-text-secondary leading-relaxed bg-bg-elevated p-3 rounded-2xl border border-border-color font-sans">
              {bio}
            </p>
          </div>
        )}

        {/* 5. Green & Red Flags */}
        {(profile.green_flags.length > 0 || profile.red_flags.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {profile.green_flags.length > 0 && (
              <div className="space-y-1.5 bg-accent-green/10 border border-accent-green/20 p-3 rounded-2xl">
                <span className="flex items-center gap-1.5 font-black text-accent-green text-[11px] uppercase font-mono">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {greenFlagsLabel}
                </span>
                <ul className="text-xs text-accent-green/90 space-y-1 pl-4 list-disc font-sans">
                  {profile.green_flags.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {profile.red_flags.length > 0 && (
              <div className="space-y-1.5 bg-accent-red/10 border border-accent-red/20 p-3 rounded-2xl">
                <span className="flex items-center gap-1.5 font-black text-accent-red text-[11px] uppercase font-mono">
                  <AlertTriangle className="h-3.5 w-3.5" /> {redFlagsLabel}
                </span>
                <ul className="text-xs text-accent-red/90 space-y-1 pl-4 list-disc font-sans">
                  {profile.red_flags.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 6. Turn On & Dealbreaker */}
        {(profile.turn_on || dealbreaker) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            {profile.turn_on && (
              <div className="bg-bg-elevated border border-border-color p-2.5 rounded-2xl space-y-0.5">
                <span className="font-bold text-accent-red uppercase text-[10px] block">{turnOnLabel}</span>
                <p className="text-text-secondary text-[11px] leading-tight font-sans">{profile.turn_on}</p>
              </div>
            )}
            {dealbreaker && (
              <div className="bg-bg-elevated border border-border-color p-2.5 rounded-2xl space-y-0.5">
                <span className="font-bold text-accent-amber uppercase text-[10px] block">{dealbreakerLabel}</span>
                <p className="text-text-secondary text-[11px] leading-tight font-sans">{dealbreaker}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
