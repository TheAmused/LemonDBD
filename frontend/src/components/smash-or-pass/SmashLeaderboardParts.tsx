'use client';

import React from 'react';
import { Heart, ThumbsDown } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { LeaderboardItem } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
import { tip } from '@/components/common/Tooltip';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { SmashSounds } from '@/components/smash-or-pass/SmashSoundEffects';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { RankFirstIcon, RankPlacedIcon } from '@/components/icons/DbdIcons';
import { formatNumber } from '@/utils/format';
import { isSurvivor as isSurvivorRole } from '@/utils/characterUtils';
import { formatMessage } from '@/utils/i18nFormat';

export interface TierConfig {
  name: string;
  style: string;
  icon: React.ReactNode;
  range: string;
}

// LocalizedMetadata is gone: it described the duplicate `i18n` / `translations` blobs and
// the `title` twin of `archetype`. EntityProfile (via localizedProfile) covers it now.

interface CandidateRowProps {
  item: LeaderboardItem;
  index: number;
  isTop3: boolean;
  hasUserSmashed: boolean;
  tier: TierConfig | null;
  locale: string;
  backendBase: string;
  rawSmashDict: Dictionary['smashOrPass'];
  survivorsLabel: string;
  killersLabel: string;
  unratedLabel: string;
  noVotesDesc: string;
  percentSign: string;
  votesWord: string;
  onSelectCharacter?: (character: LeaderboardItem) => void;
  onDragStateCheck: () => boolean;
  onMouseDownCheck: () => boolean;
}

/**
 * Highly optimized, memoized candidate row for the Hall of Fame leaderboard.
 * Uses native title attributes for badges to avoid mounting hundreds of nested Tooltip portals.
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
  survivorsLabel,
  killersLabel,
  unratedLabel,
  noVotesDesc,
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

  const avatarSrc =
    item.media_url?.startsWith('http') || item.media_url?.startsWith('/static')
      ? `${item.media_url.startsWith('http') ? '' : backendBase}${item.media_url}`
      : resolveAvatarUrl(
          backendBase,
          {
            name: itemName,
            category: item.role,
            avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${itemSlug}.png`,
          },
          isSurvivor
        );

  const profile = localizedProfile(item.metadata, locale || 'en');
  // `|| item.role` is the render-level default for an entity with no archetype yet.
  const itemSubtitle = profile.archetype || profile.tagline || item.role;

  const candidateAriaLabel = rawSmashDict?.candidateRankLabel
    ? formatMessage(rawSmashDict.candidateRankLabel, { name: itemName, rank: index + 1, rate: smashRate })
    : `${itemName} #${index + 1} (${smashRate}%)`;

  return (
    <div
      role="button"
      tabIndex={0}
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
      onMouseDown={() => {
        SmashSounds.playCardGrabSound();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectCharacter?.({ ...item, slug: itemSlug, name: itemName });
        }
      }}
      aria-label={candidateAriaLabel}
      className={`group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:p-4 rounded-3xl border transition-all duration-150 cursor-pointer select-none hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red gap-3.5 sm:gap-4 ${
        hasUserSmashed
          ? 'bg-accent-red/10 border-accent-red/50 hover:border-accent-red'
          : 'bg-bg-surface border-border-color hover:border-border-subtle hover:bg-bg-elevated hover:shadow-lg'
      }`}
    >
      {/* Left Section: Rank + Avatar + Details */}
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {/* Special Luxury Rank Medals for #1, #2, #3 */}
        <div
          className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl font-black text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 ${
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
              <RankFirstIcon className="h-5 w-5 fill-current stroke-current" />
            ) : (
              <RankPlacedIcon className="h-5 w-5" />
            )
          ) : (
            `#${index + 1}`
          )}
        </div>

        {/* Avatar Portrait */}
        <div className="relative h-13 w-13 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-bg-elevated border border-border-color shrink-0 shadow-inner group-hover:border-accent-red/50 transition-colors">
          <img
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
          {hasUserSmashed && (
            <div
              className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-text-inverted ring-2 ring-bg-surface"
              {...tip(rawSmashDict?.youSmashedThis || '', undefined, 'action')}
              aria-label={rawSmashDict?.youSmashedThis || ''}
            >
              <Heart className="h-2.5 w-2.5 fill-text-inverted text-text-inverted" />
            </div>
          )}
        </div>

        {/* Details: Name + Icon-Only Badges */}
        <div className="min-w-0 text-left flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm sm:text-base font-black text-text-primary group-hover:text-accent-red truncate">
              {itemName}
            </span>

            {/* Role Icon Badge (Accessible native tooltip) */}
            <span
              {...tip(isSurvivor ? survivorsLabel : killersLabel, undefined, 'action')}
              aria-label={isSurvivor ? survivorsLabel : killersLabel}
              className={`flex h-6 w-6 items-center justify-center rounded-lg border shrink-0 transition-transform hover:scale-110 ${
                isSurvivor
                  ? 'bg-accent-green/15 border-accent-green/40 text-accent-green'
                  : 'bg-accent-red/15 border-accent-red/40 text-accent-red'
              }`}
            >
              {isSurvivor ? <SurvivorIcon className="h-3.5 w-3.5" /> : <KillerIcon className="h-3.5 w-3.5" />}
            </span>

            {/* Tier Icon Badge or Unrated "?" Badge (Accessible native tooltip) */}
            {tier ? (
              <span
                {...tip(`${tier.name} (${tier.range})`, undefined, 'action')}
                aria-label={`${tier.name} (${tier.range})`}
                className={`flex h-6 w-6 items-center justify-center rounded-lg border shrink-0 transition-transform hover:scale-110 ${tier.style}`}
              >
                {tier.icon}
              </span>
            ) : (
              <span
                {...tip(`${unratedLabel} - ${noVotesDesc}`, undefined, 'action')}
                aria-label={`${unratedLabel} - ${noVotesDesc}`}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-border-color bg-bg-elevated text-text-muted type-strong shadow-inner shrink-0 transition-transform hover:scale-110"
              >
                ?
              </span>
            )}
          </div>

          <p className="text-xs text-text-muted italic line-clamp-1">
            {itemSubtitle}
          </p>
        </div>
      </div>

      {/* Right Section: Visual Progress Bar + Smash Percentage + Vote Breakdown */}
      <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-color">
        {/* Progress Bar */}
        <div className="flex flex-col gap-1 w-28 sm:w-32 shrink-0">
          <div className="flex items-center justify-between type-caption">
            <span className={`font-bold flex items-center gap-1 ${hasVotes ? 'text-accent-red' : 'text-text-muted'}`}>
              <Heart className={`h-3 w-3 ${hasVotes ? 'fill-accent-red text-accent-red' : 'text-text-muted'}`} />
              {hasVotes ? `${smashRate}${percentSign}` : '—'}
            </span>
            <span className="text-text-muted">
              {hasVotes ? `${100 - smashRate}${percentSign}` : '—'}
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-bg-elevated overflow-hidden flex shadow-inner">
            {hasVotes ? (
              <>
                <div
                  style={{ width: `${Math.max(4, Math.min(100, smashRate))}%` }}
                  className="h-full bg-accent-red transition-all duration-300"
                />
                <div
                  style={{ width: `${Math.max(0, 100 - smashRate)}%` }}
                  className="h-full bg-border-color"
                />
              </>
            ) : (
              <div className="h-full w-full bg-border-color" />
            )}
          </div>

          <span className="type-micro text-text-muted text-right">
            {formatNumber(totalVotes)} {votesWord}
          </span>
        </div>

        {/* Smashes / Passes Numeric Counts */}
        <div className="text-right text-xs shrink-0 min-w-[65px]">
          <div className="flex items-center gap-1.5 justify-end text-accent-red font-black">
            <Heart className="h-3.5 w-3.5 fill-accent-red" />
            <span>{smashCount}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end text-text-muted type-strong-xs mt-0.5">
            <ThumbsDown className="h-3 w-3 text-text-muted" />
            <span>{passCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
