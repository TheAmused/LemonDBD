'use client';
// frontend/src/components/smash-or-pass/CharacterStatsModal.tsx

import React, { useMemo } from 'react';
import {
  Heart,
  Flame,
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
import { FriendzoneIcon, EldritchVoidIcon } from '@/components/icons/DbdIcons';
import { Surface } from '@/components/common/Surface';
import { formatNumber } from '@/utils/format';
import { isSurvivor as isSurvivorRole } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";

interface CharacterStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: any;
  stats?: EntityStatItem;
  locale?: string;
}

export const CharacterStatsModal: React.FC<CharacterStatsModalProps> = ({ isOpen, onClose, character: rawCharacter, stats, locale = 'en' }) => {
  const dict = useDictionary();
  const backendBase = getBackendBaseUrl();
  const rawSmashDict = dict.smashOrPass;

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
  const isSurvivor = isSurvivorRole(role);
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
        tier: rawSmashDict.tiers.godTier,
        color: 'text-accent-amber',
        bg: 'bg-accent-amber/15 border-accent-amber/40',
        glow: '',
        icon: <Sparkles className="h-4 w-4 text-accent-amber" />,
      };
    }
    if (smashRate >= 65) {
      return {
        tier: rawSmashDict.tiers.fatalAttraction,
        color: 'text-accent-red',
        bg: 'bg-accent-red/15 border-accent-red/40',
        glow: '',
        icon: <Flame className="h-4 w-4 text-accent-red" />,
      };
    }
    if (smashRate >= 40) {
      return {
        tier: rawSmashDict.tiers.friendzone,
        color: 'text-text-secondary',
        bg: 'bg-bg-elevated border-border-color',
        glow: '',
        icon: <FriendzoneIcon className="h-4 w-4 text-text-secondary" />,
      };
    }
    return {
      tier: rawSmashDict.tiers.eldritchVoid,
      color: 'text-text-muted',
      bg: 'bg-bg-elevated border-border-color',
      glow: '',
      icon: <EldritchVoidIcon className="h-4 w-4 text-text-muted" />,
    };
  }, [smashRate, rawSmashDict]);

  const roleLabel = isSurvivor
    ? rawSmashDict.filters.survivors
    : rawSmashDict.filters.killers;

  const communityConsensusLabel = rawSmashDict.communityConsensus;
  const smashRateLabel = rawSmashDict.statsDetail.communitySmashRate;
  const smashesLabel = rawSmashDict.statsDetail.smashCount;
  const passesLabel = rawSmashDict.statsDetail.passCount;
  const totalVotesLabel = rawSmashDict.statsDetail.totalVotes;
  const globalRankLabel = rawSmashDict.statsDetail.rank;
  const loreQuoteLabel = rawSmashDict.loreLabels.signatureQuote;
  const loreProfileLabel = rawSmashDict.loreLabels.bio;
  const greenFlagsLabel = rawSmashDict.loreLabels.greenFlag;
  const redFlagsLabel = rawSmashDict.loreLabels.redFlag;
  const turnOnLabel = rawSmashDict.loreLabels.turn_on;
  const dealbreakerLabel = rawSmashDict.loreLabels.dealbreaker;
  const percentSign = rawSmashDict.percentSign;

  const roleBadge = (
    <span
      className={`text-tiny font-black uppercase px-2 py-0.5 rounded-lg border ${
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
              <span className="type-label-2xs text-text-muted block">
                {communityConsensusLabel}
              </span>
              <span className={`text-sm font-black ${tierInfo.color}`}>
                {tierInfo.tier}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="type-micro text-text-muted block">{smashRateLabel}</span>
            <span className="text-xl font-black text-accent-red flex items-center gap-1 justify-end">
              <Heart className="h-4 w-4 fill-accent-red" /> {smashRate}{percentSign}
            </span>
          </div>
        </div>

        {/* 2. Vote Breakdown Progress Bar */}
        <Surface tone="elevated" radius="2xl" padding="none" className="space-y-1.5 p-3.5">
          <div className="flex justify-between type-strong">
            <span className="flex items-center gap-1 text-accent-red">
              <Heart className="h-3.5 w-3.5 fill-accent-red" /> {formatNumber(smashCount)} {smashesLabel} ({smashPct}{percentSign})
            </span>
            <span className="flex items-center gap-1 text-text-muted">
              <ThumbsDown className="h-3.5 w-3.5" /> {formatNumber(passCount)} {passesLabel} ({passPct}{percentSign})
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
          <div className="flex justify-between type-micro text-text-muted pt-1">
            <span>{totalVotesLabel}: {formatNumber(totalVotes)}</span>
            {stats?.rank && <span>{globalRankLabel}: #{stats.rank}</span>}
          </div>
        </Surface>

        {/* 3. Lore Quote */}
        {quote && (
          <Surface tone="elevated" radius="2xl" padding="none" className="p-3.5 space-y-1">
            <div className="flex items-center gap-1 text-accent-amber type-label-2xs">
              <Quote className="h-3.5 w-3.5" />
              <span>{loreQuoteLabel}</span>
            </div>
            <p className="type-body text-text-secondary italic">
              {quote}
            </p>
          </Surface>
        )}

        {/* 4. Bio Profile */}
        {bio && (
          <div className="space-y-1">
            <span className="type-label-2xs text-text-muted">
              {loreProfileLabel}
            </span>
            <p className="type-body text-text-secondary bg-bg-elevated p-3 rounded-2xl border border-border-color">
              {bio}
            </p>
          </div>
        )}

        {/* 5. Complete Green & Red Flags Dossier - Hidden for now */}

        {/* 6. Turn On & Dealbreaker */}
        {(profile.turn_on || dealbreaker) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {profile.turn_on && (
              <div className="bg-bg-elevated border border-border-color p-2.5 rounded-2xl space-y-0.5">
                <span className="type-label-2xs text-accent-red block">{turnOnLabel}</span>
                <p className="text-text-secondary text-mini leading-tight">{profile.turn_on}</p>
              </div>
            )}
            {dealbreaker && (
              <div className="bg-bg-elevated border border-border-color p-2.5 rounded-2xl space-y-0.5">
                <span className="type-label-2xs text-accent-amber block">{dealbreakerLabel}</span>
                <p className="text-text-secondary text-mini leading-tight">{dealbreaker}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
