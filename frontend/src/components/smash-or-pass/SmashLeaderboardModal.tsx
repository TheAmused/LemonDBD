'use client';
// frontend/src/components/smash-or-pass/SmashLeaderboardModal.tsx

import React, { useState, useMemo, useEffect } from 'react';
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
  Info,
} from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { LeaderboardItem, EntityMetadata } from '@/types/smashOrPass';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

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

  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const userVotedSet = useMemo(() => {
    return new Set(userSmashes.map((s) => s.slug));
  }, [userSmashes]);

  const getItemTierKey = (smashRate: number): TierKey => {
    if (smashRate >= 85) return 'godTier';
    if (smashRate >= 65) return 'fatalAttraction';
    if (smashRate >= 40) return 'friendzone';
    return 'eldritchVoid';
  };

  const tierMetadata: Record<TierKey, TierConfig> = useMemo(
    () => ({
      godTier: {
        name: dict?.smashOrPass?.tiers?.godTier || '',
        style: 'border-[#ffd166]/50 bg-[#ffd166]/15 text-[#ffd166] shadow-[0_0_12px_rgba(255,209,102,0.3)]',
        icon: <Sparkles className="h-3.5 w-3.5 text-[#ffd166]" aria-hidden="true" />,
        range: '>= 85%',
      },
      fatalAttraction: {
        name: dict?.smashOrPass?.tiers?.fatalAttraction || '',
        style: 'border-[#ff0055]/50 bg-[#ff0055]/15 text-[#ff0055] shadow-[0_0_12px_rgba(255,0,85,0.3)]',
        icon: <Flame className="h-3.5 w-3.5 text-[#ff0055]" aria-hidden="true" />,
        range: '65% - 84%',
      },
      friendzone: {
        name: dict?.smashOrPass?.tiers?.friendzone || '',
        style: 'border-[#00f5d4]/50 bg-[#00f5d4]/15 text-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.3)]',
        icon: <Shield className="h-3.5 w-3.5 text-[#00f5d4]" aria-hidden="true" />,
        range: '40% - 64%',
      },
      eldritchVoid: {
        name: dict?.smashOrPass?.tiers?.eldritchVoid || '',
        style: 'border-purple-500/50 bg-purple-950/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]',
        icon: <Skull className="h-3.5 w-3.5 text-purple-300" aria-hidden="true" />,
        range: '< 40%',
      },
    }),
    [dict]
  );

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const itemSlug = item.slug || item.character_slug || '';
        const itemName = item.name || item.character_name || '';

        if (roleFilter !== 'all' && item.role !== roleFilter) return false;
        if (genderFilter !== 'all' && item.gender !== genderFilter) return false;

        if (tierFilter !== 'all') {
          const itemRate = item.smash_rate ?? item.stat?.smash_rate ?? 0;
          const itemTier = getItemTierKey(itemRate);
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
      const rate = item.smash_rate ?? item.stat?.smash_rate ?? 0;
      const tierKey = getItemTierKey(rate);
      groups[tierKey].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (!isOpen) return null;

  const rawSmashDict = dict?.smashOrPass;
  const title = rawSmashDict?.leaderboard || '';
  const searchPlaceholder = rawSmashDict?.search || '';
  const allRolesLabel = rawSmashDict?.filters?.allRoles || rawSmashDict?.allRoles || '';
  const survivorsLabel = rawSmashDict?.filters?.survivors || rawSmashDict?.survivors || '';
  const killersLabel = rawSmashDict?.filters?.killers || rawSmashDict?.killers || '';
  const allGendersLabel = rawSmashDict?.filters?.allGenders || rawSmashDict?.allGenders || '';
  const femaleOnlyLabel = rawSmashDict?.filters?.femaleOnly || rawSmashDict?.femaleOnly || '';
  const maleOnlyLabel = rawSmashDict?.filters?.maleOnly || rawSmashDict?.maleOnly || '';
  const monstersLabel = rawSmashDict?.filters?.monsters || rawSmashDict?.monsters || '';
  const closeLabel = rawSmashDict?.close || '';

  const loginNotice = rawSmashDict?.loginNotice || '';
  const groupByTierLabel = rawSmashDict?.groupByTier || '';
  const rankedListLabel = rawSmashDict?.rankedList || '';
  const sortLabel = rawSmashDict?.sort || '';
  const sortSmashRateLabel = rawSmashDict?.sortSmashRate || '';
  const sortTotalVotesLabel = rawSmashDict?.sortTotalVotes || '';
  const sortMostSmashesLabel = rawSmashDict?.sortMostSmashes || '';
  const noVotesTitle = rawSmashDict?.noCommunityVotesTitle || '';
  const noVotesDesc = rawSmashDict?.noCommunityVotesDesc || '';
  const noMatchesText = rawSmashDict?.noCandidatesFound || '';
  const votesWord = rawSmashDict?.votesWord || rawSmashDict?.votes || '';
  const smashWord = rawSmashDict?.smashWord || rawSmashDict?.smash || '';
  const passWord = rawSmashDict?.passWord || rawSmashDict?.pass || '';
  const candidatesWord = rawSmashDict?.candidatesWord || rawSmashDict?.candidatesCount || rawSmashDict?.candidates || '';

  const showingSummaryText = rawSmashDict?.showingCount
    ? rawSmashDict.showingCount
      .replace('{count}', String(filteredItems.length))
      .replace('{total}', String(items.length))
    : rawSmashDict?.showingCandidates
      ? `${rawSmashDict.showingCandidates} ${filteredItems.length}`
      : `${filteredItems.length} ${candidatesWord}`.trim();

  const renderCandidateRow = (item: LeaderboardItem, index: number) => {
    const itemSlug = item.slug || item.character_slug || '';
    const itemName = item.name || item.character_name || itemSlug;
    const isSurvivor = item.role === 'Survivor';
    const isTop3 = index < 3 && !searchQuery && tierFilter === 'all';
    const hasUserSmashed = userVotedSet.has(itemSlug);

    const smashRate = item.smash_rate ?? item.stat?.smash_rate ?? 0;
    const totalVotes = item.total_votes ?? item.stat?.total_votes ?? 0;
    const smashCount = item.smash_count ?? item.stat?.smash_count ?? 0;
    const passCount = item.pass_count ?? item.stat?.pass_count ?? 0;

    const tierKey = getItemTierKey(smashRate);
    const tier = tierMetadata[tierKey];

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
        key={itemSlug}
        role="button"
        tabIndex={0}
        onClick={() => onSelectCharacter?.({ ...item, slug: itemSlug, name: itemName })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCharacter?.({ ...item, slug: itemSlug, name: itemName });
          }
        }}
        aria-label={candidateAriaLabel}
        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0055] ${hasUserSmashed
            ? 'bg-rose-950/30 border-[#ff0055]/40 hover:border-[#ff0055]'
            : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900'
          }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl font-black font-mono text-xs shrink-0 ${isTop3
                ? index === 0
                  ? 'bg-[#ffd166] text-zinc-950 shadow-md shadow-amber-500/30'
                  : index === 1
                    ? 'bg-slate-300 text-zinc-950 shadow-md shadow-slate-300/30'
                    : 'bg-amber-700 text-white shadow-md shadow-amber-700/30'
                : 'bg-zinc-800 text-zinc-400'
              }`}
          >
            #{index + 1}
          </div>

          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
            <img
              src={avatarSrc}
              alt={itemName}
              className="h-full w-full object-cover object-top"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
              }}
            />
            {hasUserSmashed && (
              <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-[#ff0055] border-2 border-zinc-950 shadow-sm" aria-label={rawSmashDict?.youSmashedThis || ''} />
            )}
          </div>

          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black font-mono text-zinc-100 truncate">
                {itemName}
              </span>
              <span
                className={`text-[9px] font-black uppercase font-mono px-1.5 py-0.5 rounded border ${isSurvivor
                    ? 'bg-[#00f5d4]/10 text-[#00f5d4] border-[#00f5d4]/30'
                    : 'bg-[#ff0055]/10 text-[#ff0055] border-[#ff0055]/30'
                  }`}
              >
                {item.role}
              </span>
              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase font-mono px-1.5 py-0.5 rounded border ${tier.style}`}>
                {tier.icon}
                <span>{tier.name}</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 italic line-clamp-1">
              {itemSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right shrink-0">
          <div>
            <div className="flex items-center gap-1 justify-end font-black font-mono text-sm text-[#ff0055]">
              <Heart className="h-3.5 w-3.5 fill-[#ff0055]" aria-hidden="true" />
              <span>{smashRate}{dict?.smashOrPass?.percentSign || '%'}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {totalVotes.toLocaleString()} {votesWord}
            </span>
          </div>

          <div className="hidden sm:block text-right font-mono text-[10px]">
            <span className="text-[#ff0055] font-bold">
              {smashCount} {smashWord}
            </span>
            <br />
            <span className="text-zinc-500">{passCount} {passWord}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#09090b]/85 backdrop-blur-xl animate-in fade-in duration-200 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-4xl h-[92vh] max-h-[880px] overflow-hidden rounded-3xl border border-[#ff0055]/30 bg-[#09090b] shadow-2xl shadow-rose-950/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5 bg-gradient-to-r from-[#09090b] via-zinc-900 to-rose-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffd166]/15 text-[#ffd166] border border-[#ffd166]/30 shadow-md" aria-hidden="true">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="leaderboard-title" className="text-lg sm:text-xl font-black font-mono text-zinc-100 tracking-tight">
                  {title}
                </h2>
                {editionName && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ff0055]/20 text-rose-300 border border-[#ff0055]/40 text-[10px] font-bold font-mono">
                    {editionName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={dict?.smashOrPass?.close || ''}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0055]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Authentication Notice */}
        {!isAuthenticated && loginNotice && (
          <div className="bg-rose-950/30 border-b border-[#ff0055]/20 px-4 py-2 flex items-center justify-between text-xs text-rose-300 shrink-0">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-[#ff0055] shrink-0" aria-hidden="true" />
              <span>{loginNotice}</span>
            </div>
          </div>
        )}

        {/* Filter Bar 1 */}
        <div className="flex items-center gap-2 p-3 overflow-x-auto border-b border-zinc-800/80 bg-zinc-950/60 shrink-0 text-xs font-bold font-mono">
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shrink-0" role="radiogroup" aria-label={allRolesLabel}>
            <button
              type="button"
              role="radio"
              aria-checked={roleFilter === 'all'}
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${roleFilter === 'all'
                  ? 'bg-gradient-to-r from-rose-600 to-[#ff0055] text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {allRolesLabel}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={roleFilter === 'Survivor'}
              onClick={() => setRoleFilter('Survivor')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${roleFilter === 'Survivor'
                  ? 'bg-[#00f5d4] text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-[#00f5d4]'
                }`}
            >
              {survivorsLabel}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={roleFilter === 'Killer'}
              onClick={() => setRoleFilter('Killer')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${roleFilter === 'Killer'
                  ? 'bg-[#ff0055] text-white shadow'
                  : 'text-zinc-400 hover:text-[#ff0055]'
                }`}
            >
              {killersLabel}
            </button>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shrink-0" role="radiogroup" aria-label={allGendersLabel}>
            <button
              type="button"
              role="radio"
              aria-checked={genderFilter === 'all'}
              onClick={() => setGenderFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${genderFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {allGendersLabel}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={genderFilter === 'female'}
              onClick={() => setGenderFilter('female')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${genderFilter === 'female' ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:text-pink-300'
                }`}
            >
              {femaleOnlyLabel}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={genderFilter === 'male'}
              onClick={() => setGenderFilter('male')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${genderFilter === 'male' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-cyan-300'
                }`}
            >
              {maleOnlyLabel}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={genderFilter === 'monster_other'}
              onClick={() => setGenderFilter('monster_other')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${genderFilter === 'monster_other' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-purple-300'
                }`}
            >
              {monstersLabel}
            </button>
          </div>
        </div>

        {/* Filter Bar 2 */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/80 shrink-0 text-xs font-bold font-mono overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0" role="radiogroup" aria-label={rawSmashDict?.tierFilterLabel || ''}>
            {rawSmashDict?.tierFilterLabel && (
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider pl-1">
                {rawSmashDict.tierFilterLabel}
              </span>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={tierFilter === 'all'}
              onClick={() => setTierFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-[11px] transition-all cursor-pointer ${tierFilter === 'all' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {dict?.smashOrPass?.all || dict?.smashOrPass?.allTiers || ''}
            </button>
            {(Object.keys(tierMetadata) as TierKey[]).map((key) => {
              const meta = tierMetadata[key];
              const isActive = tierFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setTierFilter(key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] transition-all cursor-pointer border ${isActive ? meta.style : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  {meta.icon}
                  <span>{meta.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'flat' ? 'grouped' : 'flat')}
              className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <Layers className="h-3 w-3" aria-hidden="true" />
              <span>{viewMode === 'flat' ? groupByTierLabel : rankedListLabel}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:px-5 bg-zinc-900/60 border-b border-zinc-800 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#ff0055]/50 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs font-mono">
            <span className="text-zinc-400 flex items-center gap-1 font-bold">
              <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" /> {sortLabel}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'smash_rate' | 'total_votes' | 'smash_count')}
              aria-label={sortLabel}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-[#ff0055]/50 cursor-pointer font-mono [&>option]:bg-zinc-900"
            >
              <option value="smash_rate">{sortSmashRateLabel}</option>
              <option value="total_votes">{sortTotalVotesLabel}</option>
              <option value="smash_count">{sortMostSmashesLabel}</option>
            </select>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {totalCommunityVotes === 0 && !searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff0055]/10 border border-[#ff0055]/20 text-[#ff0055]" aria-hidden="true">
                <Heart className="h-7 w-7 fill-[#ff0055]/20 text-[#ff0055] animate-pulse" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-extrabold text-zinc-200 font-mono">{noVotesTitle}</h3>
                <p className="text-xs text-zinc-400">
                  {noVotesDesc}
                </p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">
              {noMatchesText}
            </div>
          ) : viewMode === 'grouped' ? (
            (Object.keys(tierMetadata) as TierKey[]).map((tKey) => {
              const tierList = groupedByTier[tKey];
              if (tierList.length === 0) return null;
              const meta = tierMetadata[tKey];

              return (
                <div key={tKey} className="space-y-2">
                  <div className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border ${meta.style}`}>
                    <div className="flex items-center gap-2">
                      {meta.icon}
                      <span className="font-mono font-black text-xs uppercase">{meta.name}</span>
                      <span className="text-[10px] opacity-80">({meta.range})</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold">
                      {`${tierList.length} ${candidatesWord}`.trim()}
                    </span>
                  </div>

                  <div className="space-y-2 pl-1" role="list">
                    {tierList.map((item, idx) => renderCandidateRow(item, idx))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="space-y-2" role="list">
              {filteredItems.map((item, index) => renderCandidateRow(item, index))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 p-3 sm:px-5 bg-zinc-950/90 text-xs text-zinc-400 shrink-0 font-mono">
          <span>{showingSummaryText}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition-colors cursor-pointer"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};