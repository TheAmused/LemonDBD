// frontend/src/components/smash-or-pass/SmashLeaderboardModal.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Heart,
  Skull,
  Shield,
  Search,
  ArrowUpDown,
  X,
  Flame,
  Filter,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { CharacterRosterItem } from './characterRoster';
import { getLocalizedCharacterRoster } from './rosterTranslations';
import { getAvatarUrl as resolveAvatarUrl } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

export interface LeaderboardItem {
  id?: number;
  character_slug: string;
  character_name: string;
  role: 'Killer' | 'Survivor' | string;
  gender: 'female' | 'male' | 'monster_other' | string;
  edition?: string;
  smash_count: number;
  pass_count: number;
  super_smash_count: number;
  total_votes: number;
  smash_rate: number;
}

interface SmashLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LeaderboardItem[];
  userSmashes?: Array<{ slug: string; vote: 'smash' | 'pass'; timestamp: number }>;
  onSelectCharacter?: (character: CharacterRosterItem) => void;
  editionName?: string;
  isAuthenticated?: boolean;
  locale?: string;
  dict?: any;
}

export const SmashLeaderboardModal: React.FC<SmashLeaderboardModalProps> = ({
  isOpen,
  onClose,
  items,
  userSmashes = [],
  onSelectCharacter,
  editionName = 'Fog Canon',
  isAuthenticated = false,
  locale = 'en',
  dict,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'female_survivors' | 'male_survivors' | 'female_killers' | 'male_killers' | 'monsters'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'smash_rate' | 'total_votes' | 'smash_count'>('smash_rate');

  const backendBase = getBackendBaseUrl();

  const userVotedSet = useMemo(() => {
    return new Set(userSmashes.map((s) => s.slug));
  }, [userSmashes]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Tab Filter
        if (activeTab === 'female_survivors') {
          if (item.role !== 'Survivor' || item.gender !== 'female') return false;
        } else if (activeTab === 'male_survivors') {
          if (item.role !== 'Survivor' || item.gender !== 'male') return false;
        } else if (activeTab === 'female_killers') {
          if (item.role !== 'Killer' || item.gender !== 'female') return false;
        } else if (activeTab === 'male_killers') {
          if (item.role !== 'Killer' || item.gender !== 'male') return false;
        } else if (activeTab === 'monsters') {
          if (item.gender !== 'monster_other') return false;
        }

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = item.character_name.toLowerCase().includes(q);
          const matchesSlug = item.character_slug.toLowerCase().includes(q);
          if (!matchesName && !matchesSlug) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'smash_rate') {
          if (b.smash_rate !== a.smash_rate) return b.smash_rate - a.smash_rate;
          return b.total_votes - a.total_votes;
        }
        if (sortBy === 'total_votes') return b.total_votes - a.total_votes;
        if (sortBy === 'smash_count') {
          return b.smash_count + b.super_smash_count - (a.smash_count + a.super_smash_count);
        }
        return 0;
      });
  }, [items, activeTab, searchQuery, sortBy]);

  const totalCommunityVotes = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.total_votes, 0);
  }, [items]);

  if (!isOpen) return null;

  // Localized Labels
  const title = dict?.smashOrPass?.leaderboard || 'Hall of Fame';
  const subtitle =
    dict?.smashOrPass?.leaderboardSubtitle ||
    'Official community voting statistics across all Killers & Survivors';
  const searchPlaceholder = dict?.smashOrPass?.search || 'Search leaderboard...';
  const closeLabel = dict?.smashOrPass?.close || 'Close Leaderboard';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-4xl h-[90vh] max-h-[850px] overflow-hidden rounded-3xl border border-pink-500/30 bg-slate-950 shadow-2xl shadow-rose-950/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/30">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="leaderboard-title" className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
                  {title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-bold">
                  {editionName}
                </span>
              </div>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Authentication Notice (if guest) */}
        {!isAuthenticated && (
          <div className="bg-pink-950/30 border-b border-pink-500/20 px-4 py-2 flex items-center justify-between text-xs text-pink-300">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-pink-400 shrink-0" />
              <span>Log in to have your votes counted toward the global community Hall of Fame!</span>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-3 overflow-x-auto border-b border-slate-800/80 bg-slate-950/60 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Roles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('female_survivors')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'female_survivors'
                ? 'bg-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-pink-300'
            }`}
          >
            Female Survivors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('male_survivors')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'male_survivors'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            Male Survivors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('female_killers')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'female_killers'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Female Killers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('male_killers')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'male_killers'
                ? 'bg-red-700 text-white shadow'
                : 'text-slate-400 hover:text-red-300'
            }`}
          >
            Male Killers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monsters')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'monsters'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-purple-300'
            }`}
          >
            Monsters &amp; Eldritch
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:px-5 bg-slate-900/60 border-b border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <span className="text-slate-400 flex items-center gap-1 font-bold">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-pink-500/50 cursor-pointer"
            >
              <option value="smash_rate">Smash Rate (%)</option>
              <option value="total_votes">Total Votes</option>
              <option value="smash_count">Most Smashes</option>
            </select>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
          {totalCommunityVotes === 0 && !searchQuery.trim() ? (
            // Clean Empty State
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                <Heart className="h-7 w-7 fill-pink-400/20 text-pink-400 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-extrabold text-slate-200">No Community Votes Yet</h3>
                <p className="text-xs text-slate-400">
                  Be the first Entity Champion to rate candidates! Cast votes to populate the Hall of Fame rankings.
                </p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No candidates found matching your filter criteria.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const localized = getLocalizedCharacterRoster(item.character_slug, locale);
              const isSurvivor = item.role === 'Survivor';
              const isTop3 = index < 3 && !searchQuery;
              const hasUserSmashed = userVotedSet.has(item.character_slug);

              const avatarSrc = resolveAvatarUrl(
                backendBase,
                {
                  name: localized.name,
                  category: item.role,
                  avatar_local_path: `avatars/${isSurvivor ? 'survivors' : 'killers'}/${item.character_slug}.png`,
                },
                isSurvivor
              );

              return (
                <div
                  key={item.character_slug}
                  onClick={() => onSelectCharacter?.(localized)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    hasUserSmashed
                      ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Rank + Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl font-black text-xs shrink-0 ${
                        isTop3
                          ? index === 0
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : index === 1
                            ? 'bg-slate-300 text-slate-950 shadow-md shadow-slate-300/30'
                            : 'bg-amber-700 text-white shadow-md shadow-amber-700/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{index + 1}
                    </div>

                    {/* Avatar */}
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                      <img
                        src={avatarSrc}
                        alt={localized.name}
                        className="h-full w-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/53/IconHelpLoading_players.png/revision/latest';
                        }}
                      />
                      {hasUserSmashed && (
                        <div className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-rose-500 border border-slate-950 shadow-sm" />
                      )}
                    </div>

                    {/* Name + Title */}
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-100 truncate">
                          {localized.name}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            isSurvivor
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {item.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 italic line-clamp-1">
                        {localized.title}
                      </p>
                    </div>
                  </div>

                  {/* Smash Rate + Votes */}
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <div className="flex items-center gap-1 justify-end font-black text-sm text-rose-400">
                        <Heart className="h-3.5 w-3.5 fill-rose-400" />
                        <span>{item.smash_rate}%</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {item.total_votes.toLocaleString()} votes
                      </span>
                    </div>

                    <div className="hidden sm:block text-right font-mono text-[10px]">
                      <span className="text-emerald-400 font-bold">{item.smash_count + item.super_smash_count} smash</span>
                      <br />
                      <span className="text-slate-500">{item.pass_count} pass</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 p-3 sm:px-5 bg-slate-950/90 text-xs text-slate-400">
          <span>Showing {filteredItems.length} candidates</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
