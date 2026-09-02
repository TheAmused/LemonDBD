'use client';
// frontend/src/components/smash-or-pass/SmashLeaderboardModal.tsx

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Trophy,
  Heart,
  Skull,
  Shield,
  Search,
  ArrowUpDown,
  X,
  Flame,
  Sparkles,
  Layers,
  Crown,
  Medal,
  ThumbsDown,
  User,
  Users,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { LeaderboardItem, EntityMetadata } from '@/types/smashOrPass';
import { Modal } from '@/components/common/Modal';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { Tooltip } from '@/components/common/Tooltip';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { SmashSounds } from '@/components/smash-or-pass/SmashSoundEffects';

export interface SmashLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LeaderboardItem[];
  userSmashes?: Array<{ slug: string; vote: 'smash' | 'pass'; timestamp: number }>;
  onSelectCharacter?: (character: LeaderboardItem) => void;
  editionName?: string;
  isAuthenticated?: boolean;
  locale?: string;
  dict?: Dictionary | any;
}

type TierKey = 'godTier' | 'fatalAttraction' | 'friendzone' | 'eldritchVoid';

interface TierConfig {
  name: string;
  style: string;
  icon: React.ReactNode;
  range: string;
}

interface LocalizedMetadata {
  title?: string;
  tagline?: string;
  bio?: string;
}

interface CandidateRowProps {
  item: LeaderboardItem;
  index: number;
  isTop3: boolean;
  hasUserSmashed: boolean;
  tier: TierConfig | null;
  locale: string;
  backendBase: string;
  rawSmashDict: any;
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
const CandidateRow = React.memo<CandidateRowProps>(({
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
  const isSurvivor = item.role === 'Survivor';
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

  const meta = (item.metadata || {}) as EntityMetadata & {
    translations?: Record<string, LocalizedMetadata>;
    i18n?: Record<string, LocalizedMetadata>;
  };
  const currentLoc = locale || 'en';
  const locMeta = meta.translations?.[currentLoc] || meta.i18n?.[currentLoc] || {};
  const itemSubtitle =
    locMeta.title ||
    meta.title ||
    locMeta.tagline ||
    meta.tagline ||
    item.role;

  const candidateAriaLabel = rawSmashDict?.candidateRankLabel
    ? rawSmashDict.candidateRankLabel
        .replace('{name}', itemName)
        .replace('{rank}', String(index + 1))
        .replace('{rate}', String(smashRate))
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
      className={`group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:p-4 rounded-3xl border transition-all duration-150 cursor-pointer select-none hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0055] gap-3.5 sm:gap-4 ${
        hasUserSmashed
          ? 'bg-gradient-to-r from-rose-50 via-white to-rose-50/60 dark:from-rose-950/40 dark:via-zinc-900/90 dark:to-zinc-950/90 border-[#ff0055]/50 shadow-[0_0_20px_rgba(255,0,85,0.15)] hover:border-[#ff0055]'
          : 'bg-white dark:bg-zinc-950/80 border-slate-200 dark:border-zinc-800/90 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/90 hover:shadow-lg'
      }`}
    >
      {/* Left Section: Rank + Avatar + Details */}
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {/* Special Luxury Rank Medals for #1, #2, #3 */}
        <div
          className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl font-black font-mono text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 ${
            isTop3
              ? index === 0
                ? 'bg-gradient-to-br from-amber-300 via-[#ffd166] to-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(255,209,102,0.6)] border border-amber-200 ring-2 ring-amber-400/30'
                : index === 1
                  ? 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-zinc-950 shadow-[0_0_15px_rgba(226,232,240,0.5)] border border-white ring-2 ring-slate-300/30'
                  : 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-amber-100 shadow-[0_0_15px_rgba(180,83,9,0.5)] border border-amber-500 ring-2 ring-amber-600/30'
              : 'bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800'
          }`}
        >
          {isTop3 ? (
            index === 0 ? <Crown className="h-5 w-5 fill-zinc-950 stroke-zinc-950" /> : <Medal className="h-5 w-5" />
          ) : (
            `#${index + 1}`
          )}
        </div>

        {/* Avatar Portrait */}
        <div className="relative h-13 w-13 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shrink-0 shadow-inner group-hover:border-pink-500/50 transition-colors">
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
              className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff0055] text-white shadow-[0_0_8px_rgba(255,0,85,0.9)] ring-2 ring-white dark:ring-zinc-950"
              title={rawSmashDict?.youSmashedThis || ''}
              aria-label={rawSmashDict?.youSmashedThis || ''}
            >
              <Heart className="h-2.5 w-2.5 fill-white text-white" />
            </div>
          )}
        </div>

        {/* Details: Name + Icon-Only Badges */}
        <div className="min-w-0 text-left flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm sm:text-base font-black font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-white truncate">
              {itemName}
            </span>

            {/* Role Icon Badge (Accessible native tooltip) */}
            <span
              title={isSurvivor ? survivorsLabel : killersLabel}
              aria-label={isSurvivor ? survivorsLabel : killersLabel}
              className={`flex h-6 w-6 items-center justify-center rounded-lg border shrink-0 transition-transform hover:scale-110 ${
                isSurvivor
                  ? 'bg-[#00f5d4]/15 border-[#00f5d4]/40 text-teal-700 dark:text-[#00f5d4] shadow-[0_0_8px_rgba(0,245,212,0.25)]'
                  : 'bg-[#ff0055]/15 border-[#ff0055]/40 text-pink-700 dark:text-pink-300 shadow-[0_0_8px_rgba(255,0,85,0.25)]'
              }`}
            >
              {isSurvivor ? <Shield className="h-3.5 w-3.5" /> : <Skull className="h-3.5 w-3.5" />}
            </span>

            {/* Tier Icon Badge or Unrated "?" Badge (Accessible native tooltip) */}
            {tier ? (
              <span
                title={`${tier.name} (${tier.range})`}
                aria-label={`${tier.name} (${tier.range})`}
                className={`flex h-6 w-6 items-center justify-center rounded-lg border shrink-0 transition-transform hover:scale-110 ${tier.style}`}
              >
                {tier.icon}
              </span>
            ) : (
              <span
                title={`${unratedLabel} - ${noVotesDesc}`}
                aria-label={`${unratedLabel} - ${noVotesDesc}`}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900/80 text-slate-500 dark:text-zinc-400 font-black font-mono text-xs shadow-inner shrink-0 transition-transform hover:scale-110"
              >
                ?
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400 font-sans italic line-clamp-1">
            {itemSubtitle}
          </p>
        </div>
      </div>

      {/* Right Section: Visual Progress Bar + Smash Percentage + Vote Breakdown */}
      <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-zinc-800/60">
        {/* Progress Bar */}
        <div className="flex flex-col gap-1 w-28 sm:w-32 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className={`font-bold flex items-center gap-1 ${hasVotes ? 'text-[#c40042] dark:text-[#ff0055]' : 'text-slate-500 dark:text-zinc-400'}`}>
              <Heart className={`h-3 w-3 ${hasVotes ? 'fill-[#ff0055] text-[#c40042] dark:text-[#ff0055]' : 'text-slate-400 dark:text-zinc-500'}`} />
              {hasVotes ? `${smashRate}${percentSign}` : '—'}
            </span>
            <span className="text-slate-400 dark:text-zinc-500">
              {hasVotes ? `${100 - smashRate}${percentSign}` : '—'}
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800/80 overflow-hidden flex shadow-inner">
            {hasVotes ? (
              <>
                <div
                  style={{ width: `${Math.max(4, Math.min(100, smashRate))}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 to-[#ff0055] transition-all duration-300"
                />
                <div
                  style={{ width: `${Math.max(0, 100 - smashRate)}%` }}
                  className="h-full bg-slate-300 dark:bg-zinc-700/60"
                />
              </>
            ) : (
              <div className="h-full w-full bg-slate-200 dark:bg-zinc-800/60" />
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 text-right">
            {totalVotes.toLocaleString()} {votesWord}
          </span>
        </div>

        {/* Smashes / Passes Numeric Counts */}
        <div className="text-right font-mono text-xs shrink-0 min-w-[65px]">
          <div className="flex items-center gap-1.5 justify-end text-[#c40042] dark:text-[#ff0055] font-black">
            <Heart className="h-3.5 w-3.5 fill-[#ff0055]" />
            <span>{smashCount}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end text-slate-400 dark:text-zinc-500 text-[11px] font-semibold mt-0.5">
            <ThumbsDown className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
            <span>{passCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CandidateRow.displayName = 'CandidateRow';

export const SmashLeaderboardModal: React.FC<SmashLeaderboardModalProps> = ({
  isOpen,
  onClose,
  items,
  userSmashes = [],
  onSelectCharacter,
  editionName = '',
  isAuthenticated = false,
  locale = 'en',
  dict,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Survivor' | 'Killer'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male' | 'monster_other'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | TierKey>('all');
  const [sortBy, setSortBy] = useState<'smash_rate' | 'total_votes' | 'smash_count'>('smash_rate');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [visibleCount, setVisibleCount] = useState<number>(35);

  // Reset pagination slicing on filters or modal open
  useEffect(() => {
    setVisibleCount(35);
  }, [searchQuery, roleFilter, genderFilter, tierFilter, sortBy, viewMode, isOpen]);

  // PC Grabbing & Drag-to-Scroll Physics
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ startY: number; scrollTop: number; isDragging: boolean }>({
    startY: 0,
    scrollTop: 0,
    isDragging: false,
  });
  const [isGrabbing, setIsGrabbing] = useState<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, button, select, a, [data-prevent-drag="true"]')) {
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;

    isMouseDownRef.current = true;
    setIsGrabbing(true);
    dragStartRef.current = {
      startY: e.clientY,
      scrollTop: container.scrollTop,
      isDragging: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const deltaY = e.clientY - dragStartRef.current.startY;
    if (Math.abs(deltaY) > 5) {
      dragStartRef.current.isDragging = true;
    }
    container.scrollTop = dragStartRef.current.scrollTop - deltaY;
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setIsGrabbing(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 350) {
      setVisibleCount((prev) => prev + 35);
    }
  };

  const checkDragState = useCallback(() => dragStartRef.current.isDragging, []);
  const checkMouseDown = useCallback(() => isMouseDownRef.current, []);

  const backendBase = getBackendBaseUrl();
  const rawSmashDict = dict?.smashOrPass;

  const userVotedSet = useMemo(() => {
    return new Set(userSmashes.map((s) => s.slug));
  }, [userSmashes]);

  const getItemTierKey = (smashRate: number, totalVotes: number): TierKey | null => {
    if (totalVotes === 0) return null;
    if (smashRate >= 85) return 'godTier';
    if (smashRate >= 65) return 'fatalAttraction';
    if (smashRate >= 40) return 'friendzone';
    return 'eldritchVoid';
  };

  const tierMetadata: Record<TierKey, TierConfig> = useMemo(
    () => ({
      godTier: {
        name: rawSmashDict?.tiers?.godTier || rawSmashDict?.godTier || 'God Tier',
        style: 'border-[#ffd166]/50 bg-[#ffd166]/15 text-amber-700 dark:text-[#ffd166] shadow-[0_0_10px_rgba(255,209,102,0.3)]',
        icon: <Sparkles className="h-3.5 w-3.5 text-amber-700 dark:text-[#ffd166]" aria-hidden="true" />,
        range: '>= 85%',
      },
      fatalAttraction: {
        name: rawSmashDict?.tiers?.fatalAttraction || rawSmashDict?.fatalAttraction || 'Fatal Attraction',
        style: 'border-[#ff0055]/50 bg-[#ff0055]/15 text-pink-700 dark:text-pink-300 shadow-[0_0_10px_rgba(255,0,85,0.3)]',
        icon: <Flame className="h-3.5 w-3.5 text-[#c40042] dark:text-[#ff0055]" aria-hidden="true" />,
        range: '65% - 84%',
      },
      friendzone: {
        name: rawSmashDict?.tiers?.friendzone || rawSmashDict?.friendzone || 'Friendzone',
        style: 'border-[#00f5d4]/50 bg-[#00f5d4]/15 text-teal-700 dark:text-[#00f5d4] shadow-[0_0_10px_rgba(0,245,212,0.3)]',
        icon: <Shield className="h-3.5 w-3.5 text-teal-700 dark:text-[#00f5d4]" aria-hidden="true" />,
        range: '40% - 64%',
      },
      eldritchVoid: {
        name: rawSmashDict?.tiers?.eldritchVoid || rawSmashDict?.eldritchVoid || 'Eldritch Void',
        style: 'border-purple-500/50 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
        icon: <Skull className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" aria-hidden="true" />,
        range: '< 40%',
      },
    }),
    [rawSmashDict]
  );

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const itemSlug = item.slug || item.character_slug || '';
        const itemName = item.name || item.character_name || '';
        const totalVotes = item.total_votes ?? item.stat?.total_votes ?? 0;
        const itemRate = item.smash_rate ?? item.stat?.smash_rate ?? 0;

        if (roleFilter !== 'all' && item.role !== roleFilter) return false;
        if (genderFilter !== 'all' && item.gender !== genderFilter) return false;

        if (tierFilter !== 'all') {
          const itemTier = getItemTierKey(itemRate, totalVotes);
          if (itemTier !== tierFilter) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = itemName.toLowerCase().includes(q);
          const matchesSlug = itemSlug.toLowerCase().includes(q);
          const matchesRole = item.role.toLowerCase().includes(q);
          if (!matchesName && !matchesSlug && !matchesRole) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aRate = a.smash_rate ?? a.stat?.smash_rate ?? 0;
        const bRate = b.smash_rate ?? b.stat?.smash_rate ?? 0;
        const aTotal = a.total_votes ?? a.stat?.total_votes ?? 0;
        const bTotal = b.total_votes ?? b.stat?.total_votes ?? 0;
        const aSmash = a.smash_count ?? a.stat?.smash_count ?? 0;
        const bSmash = b.smash_count ?? b.stat?.smash_count ?? 0;

        if (sortBy === 'smash_rate') {
          if (bRate !== aRate) return bRate - aRate;
          return bTotal - aTotal;
        }
        if (sortBy === 'total_votes') {
          if (bTotal !== aTotal) return bTotal - aTotal;
          return bRate - aRate;
        }
        if (sortBy === 'smash_count') {
          return bSmash - aSmash;
        }
        return 0;
      });
  }, [items, roleFilter, genderFilter, tierFilter, searchQuery, sortBy]);

  const totalCommunityVotes = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.total_votes ?? curr.stat?.total_votes ?? 0), 0);
  }, [items]);

  const groupedByTier = useMemo(() => {
    const groups: Record<TierKey, LeaderboardItem[]> = {
      godTier: [],
      fatalAttraction: [],
      friendzone: [],
      eldritchVoid: [],
    };
    filteredItems.forEach((item) => {
      const totalVotes = item.total_votes ?? item.stat?.total_votes ?? 0;
      const rate = item.smash_rate ?? item.stat?.smash_rate ?? 0;
      const tierKey = getItemTierKey(rate, totalVotes);
      if (tierKey) {
        groups[tierKey].push(item);
      }
    });
    return groups;
  }, [filteredItems]);

  const title = rawSmashDict?.modals?.leaderboardTitle || rawSmashDict?.leaderboard || 'Hall of Fame Leaderboard';
  const searchPlaceholder = rawSmashDict?.search || 'Search candidates...';
  const allRolesLabel = rawSmashDict?.filters?.allRoles || 'All Roles';
  const survivorsLabel = rawSmashDict?.filters?.survivors || 'Survivors';
  const killersLabel = rawSmashDict?.filters?.killers || 'Killers';
  const allGendersLabel = rawSmashDict?.filters?.allGenders || 'All Genders';
  const femaleOnlyLabel = rawSmashDict?.filters?.femaleOnly || 'Female';
  const maleOnlyLabel = rawSmashDict?.filters?.maleOnly || 'Male';
  const monstersLabel = rawSmashDict?.filters?.monsters || 'Monsters & Eldritch';
  const allTiersLabel = rawSmashDict?.allTiers || rawSmashDict?.all || 'All Tiers';
  const unratedLabel = rawSmashDict?.tiers?.unrated || 'Unrated';

  const groupByTierLabel = rawSmashDict?.groupByTier || 'Group by Tier';
  const rankedListLabel = rawSmashDict?.rankedList || 'Ranked List';
  const sortSmashRateLabel = rawSmashDict?.sortSmashRate || 'Smash Rate (%)';
  const sortTotalVotesLabel = rawSmashDict?.sortTotalVotes || 'Total Votes';
  const sortMostSmashesLabel = rawSmashDict?.sortMostSmashes || 'Most Smashes';
  const noVotesTitle = rawSmashDict?.noCommunityVotesTitle || 'No Community Votes Yet';
  const noVotesDesc = rawSmashDict?.noCommunityVotesDesc || 'Cast votes to populate the Hall of Fame rankings.';
  const noMatchesText = rawSmashDict?.noCandidatesFound || 'No candidates found matching your filter criteria.';
  const votesWord = rawSmashDict?.votesWord || rawSmashDict?.votes || 'votes';
  const candidatesWord = rawSmashDict?.candidatesWord || rawSmashDict?.candidates || 'candidates';
  const percentSign = rawSmashDict?.percentSign || '%';

  // Dropdown Options with Full Icon Coverage
  const roleOptions: DropdownOption<'all' | 'Survivor' | 'Killer'>[] = [
    { value: 'all', label: allRolesLabel, icon: <Users className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" /> },
    { value: 'Survivor', label: survivorsLabel, icon: <Shield className="h-3.5 w-3.5 text-teal-700 dark:text-[#00f5d4]" /> },
    { value: 'Killer', label: killersLabel, icon: <Skull className="h-3.5 w-3.5 text-[#c40042] dark:text-[#ff0055]" /> },
  ];

  const genderOptions: DropdownOption<'all' | 'female' | 'male' | 'monster_other'>[] = [
    { value: 'all', label: allGendersLabel, icon: <Sparkles className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" /> },
    {
      value: 'female',
      label: femaleOnlyLabel,
      icon: <span className="flex h-3.5 w-3.5 items-center justify-center font-bold text-pink-600 dark:text-pink-400 text-xs">♀</span>,
    },
    {
      value: 'male',
      label: maleOnlyLabel,
      icon: <span className="flex h-3.5 w-3.5 items-center justify-center font-bold text-cyan-700 dark:text-cyan-400 text-xs">♂</span>,
    },
    { value: 'monster_other', label: monstersLabel, icon: <Skull className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" /> },
  ];

  const tierOptions: DropdownOption<'all' | TierKey>[] = [
    { value: 'all', label: allTiersLabel, icon: <Layers className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" /> },
    {
      value: 'godTier',
      label: tierMetadata.godTier.name,
      sublabel: tierMetadata.godTier.range,
      icon: <Sparkles className="h-3.5 w-3.5 text-amber-700 dark:text-[#ffd166]" />,
    },
    {
      value: 'fatalAttraction',
      label: tierMetadata.fatalAttraction.name,
      sublabel: tierMetadata.fatalAttraction.range,
      icon: <Flame className="h-3.5 w-3.5 text-[#c40042] dark:text-[#ff0055]" />,
    },
    {
      value: 'friendzone',
      label: tierMetadata.friendzone.name,
      sublabel: tierMetadata.friendzone.range,
      icon: <Shield className="h-3.5 w-3.5 text-teal-700 dark:text-[#00f5d4]" />,
    },
    {
      value: 'eldritchVoid',
      label: tierMetadata.eldritchVoid.name,
      sublabel: tierMetadata.eldritchVoid.range,
      icon: <Skull className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" />,
    },
  ];

  const sortOptions: DropdownOption<'smash_rate' | 'total_votes' | 'smash_count'>[] = [
    { value: 'smash_rate', label: sortSmashRateLabel, icon: <Heart className="h-3.5 w-3.5 text-[#c40042] dark:text-[#ff0055] fill-[#ff0055]" /> },
    { value: 'total_votes', label: sortTotalVotesLabel, icon: <Users className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-400" /> },
    { value: 'smash_count', label: sortMostSmashesLabel, icon: <Flame className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" /> },
  ];

  const headerBadge = editionName ? (
    <span className="px-2.5 py-0.5 rounded-full bg-[#ff0055]/20 text-rose-700 dark:text-rose-300 border border-[#ff0055]/40 text-xs font-bold font-mono truncate max-w-[200px]">
      {editionName}
    </span>
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={title}
      icon={<Trophy className="h-6 w-6 text-amber-700 dark:text-[#ffd166]" />}
      badge={headerBadge}
      centerTitle={true}
      className="h-[88vh] max-h-[850px] min-h-[480px]"
      bodyClassName="flex flex-col"
    >
      {/* SINGLE HORIZONTAL FILTER & SEARCH TOOLBAR */}
      <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 shrink-0">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* 1. Search Bar */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#ff0055] font-mono shadow-inner transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Custom Role Dropdown */}
          <CustomDropdown<'all' | 'Survivor' | 'Killer'>
            value={roleFilter}
            onChange={setRoleFilter}
            options={roleOptions}
            icon={<Shield className="h-3.5 w-3.5" />}
            ariaLabel={allRolesLabel}
            minWidthClass="min-w-[150px]"
          />

          {/* 3. Custom Gender Dropdown */}
          <CustomDropdown<'all' | 'female' | 'male' | 'monster_other'>
            value={genderFilter}
            onChange={setGenderFilter}
            options={genderOptions}
            icon={<User className="h-3.5 w-3.5" />}
            ariaLabel={allGendersLabel}
            minWidthClass="min-w-[170px]"
          />

          {/* 4. Custom Tier Dropdown */}
          <CustomDropdown<'all' | TierKey>
            value={tierFilter}
            onChange={setTierFilter}
            options={tierOptions}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            ariaLabel={allTiersLabel}
            minWidthClass="min-w-[190px]"
          />

          {/* 5. Custom Sort Dropdown */}
          <CustomDropdown<'smash_rate' | 'total_votes' | 'smash_count'>
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
            icon={<ArrowUpDown className="h-3.5 w-3.5" />}
            ariaLabel={sortSmashRateLabel}
            minWidthClass="min-w-[160px]"
            align="right"
          />

          {/* 6. View Mode Toggle with Reusable Tooltip Component */}
          <Tooltip
            title={viewMode === 'flat' ? groupByTierLabel : rankedListLabel}
            description={
              viewMode === 'flat'
                ? (rawSmashDict?.tooltips?.groupByTierDesc || '')
                : (rawSmashDict?.tooltips?.rankedListDesc || '')
            }
            placement="bottom"
          >
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'flat' ? 'grouped' : 'flat')}
              aria-label={viewMode === 'flat' ? groupByTierLabel : rankedListLabel}
              className={`flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer shrink-0 hover:scale-105 active:scale-95 ${
                viewMode === 'grouped'
                  ? 'bg-pink-500/20 border-pink-500/60 text-pink-700 dark:text-pink-300 shadow-[0_0_12px_rgba(255,0,85,0.35)]'
                  : 'bg-white dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Leaderboard Content with Smooth PC Drag-to-Scroll & Grab Physics */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar transition-all ${
          isGrabbing ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
      >
        {totalCommunityVotes === 0 && !searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3.5">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#ff0055]/15 border border-[#ff0055]/30 text-[#c40042] dark:text-[#ff0055] shadow-[0_0_30px_rgba(255,0,85,0.3)]" aria-hidden="true">
              <Heart className="h-8 w-8 fill-[#ff0055]/30 text-[#c40042] dark:text-[#ff0055] animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono">{noVotesTitle}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-sans">
                {noVotesDesc}
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-mono">
            {noMatchesText}
          </div>
        ) : viewMode === 'grouped' ? (
          (Object.keys(tierMetadata) as TierKey[]).map((tKey) => {
            const tierList = groupedByTier[tKey];
            if (tierList.length === 0) return null;
            const meta = tierMetadata[tKey];

            return (
              <div key={tKey} className="space-y-2.5">
                <div className={`flex items-center justify-between px-4 py-2 rounded-2xl border ${meta.style}`}>
                  <div className="flex items-center gap-2">
                    {meta.icon}
                    <span className="font-mono font-black text-xs sm:text-sm uppercase tracking-wider">{meta.name}</span>
                    <span className="text-[11px] opacity-85 font-mono">({meta.range})</span>
                  </div>
                  <span className="text-xs font-mono font-black">
                    {tierList.length} {candidatesWord}
                  </span>
                </div>

                <div className="space-y-2.5 pl-1" role="list">
                  {tierList.map((item, idx) => {
                    const itemSlug = item.slug || item.character_slug || '';
                    const totalVotes = item.total_votes ?? item.stat?.total_votes ?? 0;
                    const smashRate = item.smash_rate ?? item.stat?.smash_rate ?? 0;
                    const tierKey = getItemTierKey(smashRate, totalVotes);
                    const tier = tierKey ? tierMetadata[tierKey] : null;

                    return (
                      <CandidateRow
                        key={itemSlug}
                        item={item}
                        index={idx}
                        isTop3={false}
                        hasUserSmashed={userVotedSet.has(itemSlug)}
                        tier={tier}
                        locale={locale}
                        backendBase={backendBase}
                        rawSmashDict={rawSmashDict}
                        survivorsLabel={survivorsLabel}
                        killersLabel={killersLabel}
                        unratedLabel={unratedLabel}
                        noVotesDesc={noVotesDesc}
                        percentSign={percentSign}
                        votesWord={votesWord}
                        onSelectCharacter={onSelectCharacter}
                        onDragStateCheck={checkDragState}
                        onMouseDownCheck={checkMouseDown}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-2.5" role="list">
            {filteredItems.slice(0, visibleCount).map((item, index) => {
              const itemSlug = item.slug || item.character_slug || '';
              const totalVotes = item.total_votes ?? item.stat?.total_votes ?? 0;
              const smashRate = item.smash_rate ?? item.stat?.smash_rate ?? 0;
              const isTop3 = index < 3 && !searchQuery && tierFilter === 'all';
              const tierKey = getItemTierKey(smashRate, totalVotes);
              const tier = tierKey ? tierMetadata[tierKey] : null;

              return (
                <CandidateRow
                  key={itemSlug}
                  item={item}
                  index={index}
                  isTop3={isTop3}
                  hasUserSmashed={userVotedSet.has(itemSlug)}
                  tier={tier}
                  locale={locale}
                  backendBase={backendBase}
                  rawSmashDict={rawSmashDict}
                  survivorsLabel={survivorsLabel}
                  killersLabel={killersLabel}
                  unratedLabel={unratedLabel}
                  noVotesDesc={noVotesDesc}
                  percentSign={percentSign}
                  votesWord={votesWord}
                  onSelectCharacter={onSelectCharacter}
                  onDragStateCheck={checkDragState}
                  onMouseDownCheck={checkMouseDown}
                />
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SmashLeaderboardModal;