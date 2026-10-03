'use client';
// frontend/src/components/smash-or-pass/SmashLeaderboardModal.tsx

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Heart,
  Skull,
  Search,
  ArrowUpDown,
  X,
  Flame,
  Sparkles,
  Layers,
  User,
  Users,
} from 'lucide-react';
import type { LeaderboardItem } from '@/types/smashOrPass';
import { localizedProfile } from '@/utils/entityProfile';
import { Modal } from '@/components/common/Modal';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { Tooltip } from '@/components/common/Tooltip';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { FriendzoneIcon, EldritchVoidIcon } from '@/components/icons/DbdIcons';
import { IridescentShardIcon } from '@/components/icons/DbdIcons';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { CandidateRow, type TierConfig } from "./SmashLeaderboardParts";
import { useDictionary } from "@/context/DictionaryContext";

export interface SmashLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LeaderboardItem[];
  userSmashes?: Array<{ slug: string; vote: 'smash' | 'pass'; timestamp: number }>;
  onSelectCharacter?: (character: LeaderboardItem) => void;
  editionName?: string;
  isAuthenticated?: boolean;
  locale?: string;
}

type TierKey = 'godTier' | 'fatalAttraction' | 'friendzone' | 'eldritchVoid';
// LocalizedMetadata is gone: it described the duplicate `i18n` / `translations` blobs and
// the `title` twin of `archetype`. EntityProfile (via localizedProfile) covers it now.
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
    }) => {
  const dict = useDictionary();
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
  const rawSmashDict = dict.smashOrPass;

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
        name: rawSmashDict.tiers.godTier,
        style: 'border-accent-amber/50 bg-accent-amber/15 text-accent-amber',
        icon: <Sparkles className="h-3.5 w-3.5 text-accent-amber" aria-hidden="true" />,
        range: '>= 85%',
      },
      fatalAttraction: {
        name: rawSmashDict.tiers.fatalAttraction,
        style: 'border-accent-red/50 bg-accent-red/15 text-accent-red',
        icon: <Flame className="h-3.5 w-3.5 text-accent-red" aria-hidden="true" />,
        range: '65% - 84%',
      },
      friendzone: {
        name: rawSmashDict.tiers.friendzone,
        style: 'border-border-color bg-bg-elevated text-text-secondary',
        icon: <FriendzoneIcon className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />,
        range: '40% - 64%',
      },
      eldritchVoid: {
        name: rawSmashDict.tiers.eldritchVoid,
        style: 'border-border-color bg-bg-elevated text-text-muted',
        icon: <EldritchVoidIcon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />,
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

  const title = rawSmashDict.modals.leaderboardTitle;
  const searchPlaceholder = rawSmashDict.search;
  const allRolesLabel = rawSmashDict.filters.allRoles;
  const survivorsLabel = rawSmashDict.filters.survivors;
  const killersLabel = rawSmashDict.filters.killers;
  const allGendersLabel = rawSmashDict.filters.allGenders;
  const femaleOnlyLabel = rawSmashDict.filters.femaleOnly;
  const maleOnlyLabel = rawSmashDict.filters.maleOnly;
  const monstersLabel = rawSmashDict.filters.monsters;
  const allTiersLabel = rawSmashDict.allTiers;
  const unratedLabel = rawSmashDict.tiers.unrated;

  const groupByTierLabel = rawSmashDict.groupByTier;
  const rankedListLabel = rawSmashDict.rankedList;
  const sortSmashRateLabel = rawSmashDict.sortSmashRate;
  const sortTotalVotesLabel = rawSmashDict.sortTotalVotes;
  const sortMostSmashesLabel = rawSmashDict.sortMostSmashes;
  const noVotesTitle = rawSmashDict.noCommunityVotesTitle;
  const noVotesDesc = rawSmashDict.noCommunityVotesDesc;
  const noMatchesText = rawSmashDict.noCandidatesFound;
  const votesWord = rawSmashDict.votesWord;
  const candidatesWord = rawSmashDict.candidatesWord;
  const percentSign = rawSmashDict.percentSign;

  // Dropdown Options with Full Icon Coverage
  const roleOptions: DropdownOption<'all' | 'Survivor' | 'Killer'>[] = [
    { value: 'all', label: allRolesLabel, icon: <Users className="h-3.5 w-3.5 text-text-muted" /> },
    { value: 'Survivor', label: survivorsLabel, icon: <SurvivorIcon className="h-3.5 w-3.5 text-accent-green" /> },
    { value: 'Killer', label: killersLabel, icon: <KillerIcon className="h-3.5 w-3.5 text-accent-red" /> },
  ];

  const genderOptions: DropdownOption<'all' | 'female' | 'male' | 'monster_other'>[] = [
    { value: 'all', label: allGendersLabel, icon: <Sparkles className="h-3.5 w-3.5 text-text-muted" /> },
    {
      value: 'female',
      label: femaleOnlyLabel,
      icon: <span className="flex h-3.5 w-3.5 items-center justify-center type-strong text-accent-red">♀</span>,
    },
    {
      value: 'male',
      label: maleOnlyLabel,
      icon: <span className="flex h-3.5 w-3.5 items-center justify-center type-strong text-text-secondary">♂</span>,
    },
    { value: 'monster_other', label: monstersLabel, icon: <Skull className="h-3.5 w-3.5 text-text-muted" /> },
  ];

  const tierOptions: DropdownOption<'all' | TierKey>[] = [
    { value: 'all', label: allTiersLabel, icon: <Layers className="h-3.5 w-3.5 text-text-muted" /> },
    {
      value: 'godTier',
      label: tierMetadata.godTier.name,
      sublabel: tierMetadata.godTier.range,
      icon: <Sparkles className="h-3.5 w-3.5 text-accent-amber" />,
    },
    {
      value: 'fatalAttraction',
      label: tierMetadata.fatalAttraction.name,
      sublabel: tierMetadata.fatalAttraction.range,
      icon: <Flame className="h-3.5 w-3.5 text-accent-red" />,
    },
    {
      value: 'friendzone',
      label: tierMetadata.friendzone.name,
      sublabel: tierMetadata.friendzone.range,
      icon: <FriendzoneIcon className="h-3.5 w-3.5 text-text-secondary" />,
    },
    {
      value: 'eldritchVoid',
      label: tierMetadata.eldritchVoid.name,
      sublabel: tierMetadata.eldritchVoid.range,
      icon: <EldritchVoidIcon className="h-3.5 w-3.5 text-text-muted" />,
    },
  ];

  const sortOptions: DropdownOption<'smash_rate' | 'total_votes' | 'smash_count'>[] = [
    { value: 'smash_rate', label: sortSmashRateLabel, icon: <Heart className="h-3.5 w-3.5 text-accent-red fill-accent-red" /> },
    { value: 'total_votes', label: sortTotalVotesLabel, icon: <Users className="h-3.5 w-3.5 text-text-secondary" /> },
    { value: 'smash_count', label: sortMostSmashesLabel, icon: <Flame className="h-3.5 w-3.5 text-accent-amber" /> },
  ];

  const headerBadge = editionName ? (
    <span className="px-2.5 py-0.5 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/40 type-strong truncate max-w-[200px]">
      {editionName}
    </span>
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={title}
      icon={<IridescentShardIcon className="h-6 w-6 text-accent-amber" />}
      badge={headerBadge}
      centerTitle={true}
      className="h-[88vh] max-h-[850px] min-h-[480px]"
      bodyClassName="flex flex-col"
    >
      {/* SINGLE HORIZONTAL FILTER & SEARCH TOOLBAR */}
      <div className="p-3.5 sm:p-4 bg-bg-elevated border-b border-border-color shrink-0">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* 1. Search Bar */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            <Input
              fieldSize="sm"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost" size="xs" icon
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* 2. Custom Role Dropdown */}
          <CustomDropdown<'all' | 'Survivor' | 'Killer'>
            value={roleFilter}
            onChange={setRoleFilter}
            options={roleOptions}
            icon={<Users className="h-3.5 w-3.5" />}
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
          <Tooltip variant="action"
            title={viewMode === 'flat' ? groupByTierLabel : rankedListLabel}
            description={
              viewMode === 'flat'
                ? (rawSmashDict.tooltips.groupByTierDesc)
                : (rawSmashDict.tooltips.rankedListDesc)
            }
            placement="bottom"
          >
            <Button
              variant={viewMode === 'grouped' ? 'soft' : 'secondary'} size="sm" icon
              onClick={() => setViewMode(viewMode === 'flat' ? 'grouped' : 'flat')}
              aria-label={viewMode === 'flat' ? groupByTierLabel : rankedListLabel}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"
            >
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
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
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-red/15 border border-accent-red/30 text-accent-red" aria-hidden="true">
              <Heart className="h-8 w-8 fill-accent-red/30 text-accent-red animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-black text-text-primary">{noVotesTitle}</h3>
              <p className="text-xs sm:text-sm text-text-muted">
                {noVotesDesc}
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs sm:text-sm text-text-muted">
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
                    <span className="font-black text-xs sm:text-sm uppercase tracking-wider">{meta.name}</span>
                    <span className="type-caption opacity-85">({meta.range})</span>
                  </div>
                  <span className="type-strong">
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