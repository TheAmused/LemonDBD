'use client';

import React from 'react';
import type { Dictionary } from '@/locales/types';
import type { LeaderboardItem } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
import { tip } from '@/components/common/Tooltip';
import { resolveSmashPortraitUrls } from './smashAvatarUrl';
import { SmashSounds } from '@/components/smash-or-pass/SmashSoundEffects';
import { RankFirstIcon, RankPlacedIcon, HeartIcon, PassIcon } from '@/components/icons/DbdIcons';

import { formatNumber } from '@/utils/format';
import { isSurvivor as isSurvivorRole } from '@/utils/characterUtils';
import { formatMessage } from '@/utils/i18nFormat';
import { Surface } from '@/components/common/Surface';
import { Badge } from '@/components/common/Badge';
import { TileButton } from '@/components/common/TileButton';
import { MotionImg } from '@/components/common/MotionImg';

export interface TierConfig {
  name: string;
  style: string;
  icon: React.ReactNode;
  range: string;
}

interface CandidateRowProps {
  item: LeaderboardItem;
  index: number;
  isTop3: boolean;
  hasUserSmashed: boolean;
  tier: TierConfig | null;
  locale: string;
  backendBase: string;
  rawSmashDict: Dictionary['smashOrPass'];
  survivorLabel: string;
  killerLabel: string;
  unratedLabel: string;
  noVotesDesc: string;
  percentSign: string;
  votesWord: string;
  onSelectCharacter?: (character: LeaderboardItem) => void;
  onDragStateCheck: () => boolean;
  onMouseDownCheck: () => boolean;
}

/**
 * Compact, high-signal candidate row for the Hall of Fame leaderboard.
 */
export const CandidateRow = React.memo<CandidateRowProps>(({
  item,
  index,
  isTop3,
  hasUserSmashed,
  tier,
  locale,
  backendBase,
  rawSmashDict,
  survivorLabel,
  killerLabel,
  percentSign,
  votesWord,
  onSelectCharacter,
  onDragStateCheck,
  onMouseDownCheck,
}) => {
  const itemSlug = item.slug || item.character_slug || '';
  const itemName = item.name || item.character_name || itemSlug;
  const isSurvivor = isSurvivorRole(item.role);
  const totalVotes = item.total_votes ?? item.stat?.total_votes ?? 0;
  const smashRate = item.smash_rate ?? item.stat?.smash_rate ?? 0;
  const smashCount = item.smash_count ?? item.stat?.smash_count ?? 0;
  const passCount = item.pass_count ?? item.stat?.pass_count ?? 0;
  const hasVotes = totalVotes > 0;

  const { thumbSrc: avatarSrc } = resolveSmashPortraitUrls(
    {
      slug: itemSlug,
      name: itemName,
      role: item.role,
      media_url: item.media_url,
    },
    { backendBase, thumbWidth: 128, fallbackExt: 'png' }
  );

  const profile = localizedProfile(item.metadata, locale || 'en');
  const itemSubtitle = profile.archetype || profile.tagline || '';

  const candidateAriaLabel = rawSmashDict?.candidateRankLabel
    ? formatMessage(rawSmashDict.candidateRankLabel, { name: itemName, rank: index + 1, rate: smashRate })
    : `${itemName} #${index + 1} (${smashRate}%)`;

  return (
    <TileButton
      press={false}
      onClick={() => {
        if (onDragStateCheck()) return;
        SmashSounds.playHoverTick();
        onSelectCharacter?.({ ...item, slug: itemSlug, name: itemName });
      }}
      onMouseEnter={() => {
        if (!onMouseDownCheck()) {
          SmashSounds.playHoverTick();
        }
      }}
      aria-label={candidateAriaLabel}
      className={`group relative flex w-full items-center p-2.5 sm:px-4 sm:py-3 rounded-card border text-left transition-all duration-150 select-none hover:shadow-lg active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red gap-2.5 sm:gap-3.5 ${
        hasUserSmashed
          ? 'bg-accent-red/10 border-accent-red/50 hover:border-accent-red'
          : 'bg-bg-surface border-border-color hover:border-border-subtle hover:bg-bg-elevated'
      }`}
    >
      {/* Rank Badge */}
      <div
        className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-chip font-black text-xs sm:text-sm shrink-0 ${
          isTop3
            ? index === 0
              ? 'medal-gold'
              : index === 1
                ? 'medal-silver'
                : 'medal-bronze'
            : 'bg-bg-elevated text-text-muted border border-border-color'
        }`}
      >
        {isTop3 ? (
          index === 0 ? (
            <RankFirstIcon className="icon-md fill-current stroke-current" />
          ) : (
            <RankPlacedIcon className="icon-md" />
          )
        ) : (
          `#${index + 1}`
        )}
      </div>

      {/* Clean Avatar Portrait (no overlapping badges) */}
      <Surface tone="elevated" padding="none" className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden shrink-0">
        <MotionImg
          src={avatarSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.triedFallback) {
              target.dataset.triedFallback = '1';
              target.src = `${backendBase}/static/avatars/survivors/sable_ward.webp`;
            }
          }}
        />
      </Surface>

      {/* Main Content: Name + Rate on top, Progress Bar + Counts below */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm sm:text-base font-bold text-text-primary group-hover:text-accent-red truncate">
              {itemName}
            </span>
            {hasUserSmashed && (
              <span
                {...tip(rawSmashDict?.youSmashedThis || '', undefined, 'status')}
                aria-label={rawSmashDict?.youSmashedThis || ''}
                className="inline-flex shrink-0 text-accent-red"
              >
                <HeartIcon className="icon-xs fill-accent-red" />
              </span>
            )}
            <Badge tone={isSurvivor ? 'green' : 'red'} size="xs" className="hidden sm:inline-flex shrink-0">
              {isSurvivor ? survivorLabel : killerLabel}
            </Badge>
            {tier && (
              <span
                {...tip(`${tier.name} (${tier.range})`, undefined, 'status')}
                aria-label={`${tier.name} (${tier.range})`}
                className={`hidden sm:flex h-5 w-5 items-center justify-center rounded-chip border shrink-0 ${tier.style}`}
              >
                {tier.icon}
              </span>
            )}
          </div>

          <span className={`shrink-0 text-sm sm:text-base font-black tabular-nums ${hasVotes ? 'text-accent-red' : 'text-text-muted'}`}>
            {hasVotes ? `${smashRate}${percentSign}` : '—'}
          </span>
        </div>

        {itemSubtitle && (
          <p className="hidden sm:line-clamp-1 text-xs text-text-muted mt-0.5">
            {itemSubtitle}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 rounded-full bg-bg-elevated overflow-hidden flex">
            {hasVotes ? (
              <div
                style={{ width: `${Math.max(3, Math.min(100, smashRate))}%` }}
                className="h-full bg-accent-red transition-all duration-300"
              />
            ) : (
              <div className="h-full w-full bg-border-color" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs tabular-nums shrink-0">
            <span className="flex items-center gap-1 text-accent-red font-bold">
              <HeartIcon className="icon-xs fill-accent-red" />
              {smashCount}
            </span>
            <span className="flex items-center gap-1 text-text-muted">
              <PassIcon className="icon-xs text-text-muted" />
              {passCount}
            </span>
            <span className="hidden sm:inline text-text-muted">
              · {formatNumber(totalVotes)} {votesWord}
            </span>
          </div>
        </div>
      </div>
    </TileButton>
  );
});
