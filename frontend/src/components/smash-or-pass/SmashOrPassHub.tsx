// frontend/src/components/smash-or-pass/SmashOrPassHub.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Heart,
  Skull,
  Shield,
  Volume2,
  VolumeX,
  Music,
  Trophy,
  RotateCcw,
  Sparkles,
  Shuffle,
  HelpCircle,
  Layers,
  ChevronDown,
  Trash2,
  AlertTriangle,
  ThumbsDown,
  X,
  RotateCw,
  Maximize2,
  Gamepad2,
} from 'lucide-react';
import { CharacterCard } from './CharacterCard';
import { SmashAnimations } from './SmashAnimations';
import { InteractiveDragBackground } from './InteractiveDragBackground';
import { FloatingLoreScattered } from './FloatingLoreScattered';
import { TactileKeycaps } from './TactileKeycaps';
import { SmashLeaderboardModal } from './SmashLeaderboardModal';
import { CharacterStatsModal } from './CharacterStatsModal';
import { RomancePersonaModal } from './RomancePersonaModal';
import { SmashSounds } from './SmashSoundEffects';
import {
  EntityItem,
  RosterItem,
  CharacterRole,
  CharacterGender,
  LeaderboardItem,
} from '@/types/smashOrPass';
import {
  fetchRosters,
  fetchRosterFeed,
  castVote as apiCastVote,
  fetchLeaderboard,
  resetSessionVotes as apiResetSessionVotes,
  resetUserVotes as apiResetUserVotes,
} from '@/services/smashApi';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';

interface SmashOrPassHubProps {
  dict?: any;
  locale?: string;
}

export const SmashOrPassHub: React.FC<SmashOrPassHubProps> = ({ dict, locale = 'en' }) => {
  const backendBase = getBackendBaseUrl();
  const { user, token, isAuthenticated } = useAuth();

  // Rosters State (Database-Driven)
  const [rosters, setRosters] = useState<RosterItem[]>([]);
  const [selectedRosterSlug, setSelectedRosterSlug] = useState<string>('canon');

  // Filters State
  const [roleFilter, setRoleFilter] = useState<'all' | CharacterRole>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | CharacterGender>('all');

  // Deck & Card State (Database-Driven Entities)
  const [deck, setDeck] = useState<EntityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalRemaining, setTotalRemaining] = useState<number>(0);
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Single-Card Exit Lifecycle (1.6s Full Duration)
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [exitVote, setExitVote] = useState<'smash' | 'pass' | null>(null);
  const [exitOffset, setExitOffset] = useState<{ x: number; y: number } | undefined>(undefined);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live Drag State
  const [dragPhysics, setDragPhysics] = useState<{ x: number; y: number; isDragging: boolean }>({
    x: 0,
    y: 0,
    isDragging: false,
  });

  // Voting History & Session State
  const [voteHistory, setVoteHistory] = useState<
    Array<{ character: EntityItem; vote: 'smash' | 'pass'; timestamp: number }>
  >([]);
  const [sessionSmashes, setSessionSmashes] = useState<number>(0);
  const [sessionPasses, setSessionPasses] = useState<number>(0);

  // Animation Triggers
  const [animTrigger, setAnimTrigger] = useState<{
    type: 'smash' | 'pass' | null;
    key: number;
    originX?: number;
    originY?: number;
  }>({ type: null, key: 0 });

  // Modals & UI Controls
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [selectedStatCharacter, setSelectedStatCharacter] = useState<EntityItem | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(SmashSounds.getIsMuted());
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(SmashSounds.getIsBgmPlaying());

  // Active Roster Metadata
  const activeRoster: RosterItem = useMemo(() => {
    return (
      rosters.find((r) => r.slug === selectedRosterSlug) || {
        id: 'canon',
        slug: 'canon',
        name_i18n_key: 'smashOrPass.rosters.canon.name',
        description_i18n_key: 'smashOrPass.rosters.canon.desc',
        name: 'Dead by Daylight: Fog Canon',
        description: 'Official 98 Characters',
        theme_color: '#ff0055',
        category: 'DBD Canon',
        is_nsfw: false,
        is_active: true,
      }
    );
  }, [rosters, selectedRosterSlug]);

  // 1. Fetch available rosters from PostgreSQL database
  const loadRosters = useCallback(async () => {
    try {
      const rosterList = await fetchRosters();
      if (rosterList && rosterList.length > 0) {
        setRosters(rosterList);
      }
    } catch (err) {
      console.debug('Failed to fetch rosters:', err);
    }
  }, []);

  // 2. Fetch Leaderboard from PostgreSQL database
  const loadLeaderboard = useCallback(async () => {
    try {
      const items = await fetchLeaderboard(selectedRosterSlug);
      if (items) {
        setLeaderboardItems(items);
      }
    } catch (err) {
      console.debug('Failed to fetch leaderboard:', err);
    }
  }, [selectedRosterSlug]);

  // 3. Fetch Roster Feed from PostgreSQL database
  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const feed = await fetchRosterFeed(selectedRosterSlug, {
        role: roleFilter !== 'all' ? roleFilter : undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
      });

      if (feed && feed.entities) {
        const shuffled = [...feed.entities].sort(() => Math.random() - 0.5);
        setDeck(shuffled);
        setCurrentIndex(0);
        setTotalRemaining(feed.total_remaining ?? feed.entities.length);
      }
    } catch (err) {
      console.debug('Failed to load feed from database:', err);
    } finally {
      setLoading(false);
      setIsExiting(false);
      setExitVote(null);
      setExitOffset(undefined);
    }
  }, [selectedRosterSlug, roleFilter, genderFilter]);

  // Initial Load
  useEffect(() => {
    loadRosters();
  }, [loadRosters]);

  useEffect(() => {
    loadFeed();
    loadLeaderboard();
  }, [loadFeed, loadLeaderboard]);

  const handleFilterChange = (type: 'role' | 'gender', value: any) => {
    if (type === 'role') setRoleFilter(value);
    if (type === 'gender') setGenderFilter(value);
  };

  const shuffleDeck = useCallback(() => {
    setDeck((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    SmashSounds.playFlipSound();
  }, []);

  const currentCharacter = deck[currentIndex] || null;

  // 4. Complete Exit Transition
  const handleExitComplete = useCallback(() => {
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);

    setCurrentIndex((idx) => idx + 1);
    setTotalRemaining((r) => Math.max(0, r - 1));
    setIsExiting(false);
    setExitVote(null);
    setExitOffset(undefined);
    setDragPhysics({ x: 0, y: 0, isDragging: false });
  }, []);

  // 5. Handle Vote (Smash or Pass) with Database API
  const handleVote = useCallback(
    async (vote: 'smash' | 'pass', origin?: { x: number; y: number }) => {
      if (!currentCharacter || isExiting) return;

      if (vote === 'smash') {
        SmashSounds.playSmashSound();
        setSessionSmashes((s) => s + 1);
      } else {
        SmashSounds.playPassSound();
        setSessionPasses((p) => p + 1);
      }

      setAnimTrigger((prev) => ({
        type: vote,
        key: prev.key + 1,
        originX: origin?.x,
        originY: origin?.y,
      }));

      let initialOffset = { x: 0, y: 0 };
      if (dragPhysics.x !== 0 || dragPhysics.y !== 0) {
        initialOffset = { x: dragPhysics.x, y: dragPhysics.y };
      } else {
        initialOffset = vote === 'smash' ? { x: 130, y: 0 } : { x: -130, y: 0 };
      }

      setIsExiting(true);
      setExitVote(vote);
      setExitOffset(initialOffset);

      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = setTimeout(() => {
        handleExitComplete();
      }, 1650);

      setVoteHistory((prev) => [
        ...prev,
        { character: currentCharacter, vote, timestamp: Date.now() },
      ]);

      // Call database API to cast vote
      try {
        await apiCastVote(currentCharacter.id, vote, currentCharacter.slug);
      } catch (err) {
        console.debug('Failed to cast vote to database:', err);
      }
    },
    [currentCharacter, isExiting, dragPhysics, handleExitComplete]
  );

  // 6. Reset All Votes via Database API
  const handleResetAllVotes = useCallback(async () => {
    setIsResetConfirmOpen(false);

    try {
      if (isAuthenticated || token || user?.id) {
        await apiResetUserVotes(selectedRosterSlug);
      } else {
        await apiResetSessionVotes(selectedRosterSlug);
      }
    } catch (err) {
      console.error('Failed to reset votes on backend database:', err);
    }

    setVoteHistory([]);
    setSessionSmashes(0);
    setSessionPasses(0);
    setRoleFilter('all');
    setGenderFilter('all');
    await loadFeed();
    await loadLeaderboard();
    SmashSounds.playFlipSound();
  }, [selectedRosterSlug, isAuthenticated, token, user?.id, loadFeed, loadLeaderboard]);

  const areModalsOpen =
    isLeaderboardOpen ||
    isPersonaOpen ||
    isResetConfirmOpen ||
    isHowToPlayOpen ||
    Boolean(selectedStatCharacter);

  // Keyboard Shortcuts (Deck Voting & Global HUD)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Audio & Modals
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const next = SmashSounds.toggleMute();
        setIsMuted(next);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        const next = SmashSounds.toggleBgm();
        setIsBgmPlaying(next);
      } else if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setIsHowToPlayOpen((prev) => !prev);
      }

      // Deck voting keys (only when no modal is open and candidate is active)
      if (areModalsOpen || !currentCharacter || isExiting) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleVote('pass');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleVote('smash');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setSelectedStatCharacter(currentCharacter);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsResetConfirmOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [areModalsOpen, currentCharacter, isExiting, handleVote]);

  const toggleSound = () => {
    const next = SmashSounds.toggleMute();
    setIsMuted(next);
    if (!next) SmashSounds.playHeartbeat(1.1);
  };

  const toggleMusic = () => {
    const next = SmashSounds.toggleBgm();
    setIsBgmPlaying(next);
  };

  const userSmashesList = useMemo(() => {
    return voteHistory
      .filter((v) => v.vote === 'smash')
      .map((v) => ({ slug: v.character.slug, vote: v.vote, timestamp: v.timestamp }));
  }, [voteHistory]);

  const totalSessionVotes = sessionSmashes + sessionPasses;
  const sessionSmashRate =
    totalSessionVotes > 0 ? Math.round((sessionSmashes / totalSessionVotes) * 100) : 0;

  const totalEditionCount = activeRoster.entity_count || deck.length;
  const remainingInDeck = Math.max(0, deck.length - currentIndex);

  // Localized Strings
  const title = dict?.smashOrPass?.title || 'Smash or Pass';
  const subtitle =
    dict?.smashOrPass?.subtitle ||
    'Evaluate Dead by Daylight candidates, discover your Trial Romance Archetype, and contribute to the community rankings.';
  const allRolesLabel = dict?.smashOrPass?.allRoles || 'All Roles';
  const survivorsLabel = dict?.smashOrPass?.survivors || 'Survivors';
  const killersLabel = dict?.smashOrPass?.killers || 'Killers';
  const allGendersLabel = dict?.smashOrPass?.allGenders || 'All Genders';
  const femaleOnlyLabel = dict?.smashOrPass?.femaleOnly || 'Female Only';
  const maleOnlyLabel = dict?.smashOrPass?.maleOnly || 'Male Only';
  const monstersLabel = dict?.smashOrPass?.monsters || 'Monsters & Eldritch';
  const leaderboardLabel = dict?.smashOrPass?.leaderboard || 'Hall of Fame';
  const shuffleLabel = dict?.smashOrPass?.shuffle || 'Shuffle';

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-start space-y-4 pb-12 overflow-hidden">
      {/* Interactive Reactive Background */}
      <InteractiveDragBackground
        dragX={dragPhysics.x}
        dragY={dragPhysics.y}
        isDragging={dragPhysics.isDragging}
        actionTrigger={animTrigger.type}
        triggerKey={animTrigger.key}
      />

      {/* Scattered Ambient Lore in Safe Zones with High-Intensity Interactive Hover Effects */}
      <FloatingLoreScattered character={currentCharacter} locale={locale} />

      {/* Particle & Visual Overlay Animation Engine */}
      <SmashAnimations
        triggerType={animTrigger.type}
        triggerKey={animTrigger.key}
        originX={animTrigger.originX}
        originY={animTrigger.originY}
        dict={dict}
      />

      {/* HEADER BAR WITH EMBEDDED HUD METRICS */}
      <header className="relative z-20 overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/40 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Heart className="h-4 w-4 fill-pink-400 animate-pulse" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-300 to-red-300 font-mono tracking-tight">
                {title}
              </h1>

              {/* Dynamic PostgreSQL Database Roster Dropdown */}
              <div className="relative inline-block">
                <select
                  value={selectedRosterSlug}
                  onChange={(e) => setSelectedRosterSlug(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1 rounded-xl bg-slate-900 border border-pink-500/30 text-xs font-black text-pink-300 hover:border-pink-400 focus:outline-none cursor-pointer transition-all shadow-md"
                >
                  {rosters.length > 0
                    ? rosters.map((r) => (
                        <option key={r.slug} value={r.slug} className="bg-slate-950 text-slate-200">
                          {r.name || r.slug} ({r.entity_count ?? r.character_count ?? 0})
                        </option>
                      ))
                    : (
                        <option value="canon" className="bg-slate-950 text-slate-200">
                          Dead by Daylight: Fog Canon (98)
                        </option>
                      )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pink-400 pointer-events-none" />
              </div>
            </div>
            <p className="text-xs text-slate-300/90 max-w-xl line-clamp-2 sm:line-clamp-none">
              {subtitle}
            </p>
          </div>

          {/* Integrated HUD Status Bar & Action Badges */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live Session Counter Badges */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold shadow-inner">
              <span className="flex items-center gap-1 text-slate-400" title="Remaining Candidates in Deck">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                <span>{remainingInDeck} left</span>
                <span className="text-[10px] text-slate-500">({totalSessionVotes}/{totalEditionCount})</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-rose-400" title="Smash Count">
                <Heart className="h-3 w-3 fill-rose-400" />
                <span>{sessionSmashes} Smash</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-400" title="Pass Count">
                <ThumbsDown className="h-3 w-3" />
                <span>{sessionPasses} Pass</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-pink-400 font-mono" title="Session Smash Rate">{sessionSmashRate}%</span>
            </div>

            {/* Sexy Twisted Background Music Toggle */}
            <button
              type="button"
              onClick={toggleMusic}
              title={isBgmPlaying ? 'Pause Sexy Ambience Music (B)' : 'Play Sexy Ambience Music (B)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-black transition-all shadow-md cursor-pointer ${
                isBgmPlaying
                  ? 'bg-rose-950/80 border-[#ff0055] text-pink-300 shadow-[0_0_15px_rgba(255,0,85,0.4)] animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="h-3.5 w-3.5 text-pink-400" />
              <span>BGM</span>
            </button>

            {/* Romance Archetype Button */}
            <button
              type="button"
              onClick={() => setIsPersonaOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-pink-500/15 border border-pink-500/40 text-pink-300 hover:bg-pink-500/25 text-xs font-black transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-pink-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Archetype</span>
            </button>

            {/* Leaderboard Button */}
            <button
              type="button"
              onClick={() => setIsLeaderboardOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>{leaderboardLabel}</span>
            </button>

            {/* Reset All Votes Button */}
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              title="Reset All My Votes"
              className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              title={isMuted ? 'Unmute Sound FX (M)' : 'Mute Sound FX (M)'}
              className={`flex h-8 w-8 items-center justify-center rounded-2xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : 'bg-pink-500/15 border-pink-500/40 text-pink-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              }`}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* How to Play Help Button */}
            <button
              type="button"
              onClick={() => setIsHowToPlayOpen(true)}
              title="How to Play & Controls"
              className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* FILTER CONTROLS BAR */}
      <section aria-label="Filters" className="flex flex-col md:flex-row items-center justify-between gap-3 relative z-20">
        {/* Role Filters */}
        <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-2xl w-full md:w-auto shadow-inner text-xs font-bold">
          <button
            type="button"
            onClick={() => handleFilterChange('role', 'all')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl transition-all cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {allRolesLabel}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('role', 'Survivor')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              roleFilter === 'Survivor'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            {survivorsLabel}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('role', 'Killer')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              roleFilter === 'Killer'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <Skull className="h-3.5 w-3.5" />
            {killersLabel}
          </button>
        </div>

        {/* Gender / Monster Filters */}
        <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-2xl w-full md:w-auto shadow-inner text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => handleFilterChange('gender', 'all')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              genderFilter === 'all'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {allGendersLabel}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('gender', 'female')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              genderFilter === 'female'
                ? 'bg-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-pink-300'
            }`}
          >
            {femaleOnlyLabel}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('gender', 'male')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              genderFilter === 'male'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            {maleOnlyLabel}
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('gender', 'monster_other')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              genderFilter === 'monster_other'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-purple-300'
            }`}
          >
            {monstersLabel}
          </button>
        </div>

        {/* Deck Utilities */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={shuffleDeck}
            title="Shuffle Remaining Candidates"
            className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>{shuffleLabel}</span>
          </button>
        </div>
      </section>

      {/* MAIN INTERACTIVE ARENA (ZERO KEYCAPS ON MAIN SCREEN) */}
      <main className="relative flex-1 flex flex-col items-center justify-center my-4 z-20 pointer-events-none">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-400 pointer-events-auto">
            <Heart className="h-10 w-10 text-rose-500 animate-ping" />
            <span className="text-xs font-mono">Loading {activeRoster.name || selectedRosterSlug} from Database...</span>
          </div>
        ) : currentCharacter ? (
          <div className="relative flex flex-col items-center justify-center pointer-events-auto">
            <CharacterCard
              key={`${currentCharacter.id || currentCharacter.slug}-${currentIndex}`}
              character={currentCharacter}
              onVote={handleVote}
              onDragUpdate={(x, y, isDragging) => setDragPhysics({ x, y, isDragging })}
              isTopCard={true}
              isExiting={isExiting}
              exitType={exitVote}
              initialExitOffset={exitOffset}
              onExitComplete={handleExitComplete}
              locale={locale}
              dict={dict}
            />
          </div>
        ) : (
          // Finished Deck State
          <div className="max-w-md w-full rounded-3xl border border-pink-500/30 bg-slate-900/90 p-8 text-center space-y-5 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400">
              <Heart className="h-8 w-8 fill-pink-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-100">All Candidates Evaluated!</h3>
              <p className="text-xs text-slate-400">
                You have completed all available candidates in {activeRoster.name || selectedRosterSlug}.
              </p>
            </div>

            {/* Session Stats Summary */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-rose-400 font-bold uppercase">Smash</span>
                <p className="text-2xl font-black text-slate-100">{sessionSmashes}</p>
              </div>
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 font-bold uppercase">Pass</span>
                <p className="text-2xl font-black text-slate-100">{sessionPasses}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPersonaOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs transition-all shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>View Romance Archetype</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition-all border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-slate-400" />
                <span>Reset &amp; Play Again</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* HOW TO PLAY MODAL (CONTAINING THE KEYBOARD KEYCAPS & CONTROLS EXPLANATION) */}
      {isHowToPlayOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-title"
          onClick={() => setIsHowToPlayOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-pink-500/40 bg-slate-900 p-6 space-y-5 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  <Gamepad2 className="h-5 w-5" />
                </span>
                <h3 id="how-to-play-title" className="text-base font-black text-slate-100 font-mono">
                  How to Play Smash or Pass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              {/* 1. Drag / Swipe */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-xl shrink-0">👆</span>
                <div>
                  <span className="font-bold text-pink-300 block text-xs">Swipe or Drag Cards</span>
                  <p className="text-slate-400 leading-relaxed pt-0.5">
                    Drag card <strong className="text-pink-400">Right</strong> to <strong>Smash</strong> 💋 or drag <strong className="text-cyan-400">Left</strong> to <strong>Pass</strong> ✖.
                  </p>
                </div>
              </div>

              {/* 2. On-card Tactile Buttons */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-xl shrink-0">🎯</span>
                <div>
                  <span className="font-bold text-pink-300 block text-xs">On-Card Action Icons</span>
                  <p className="text-slate-400 leading-relaxed pt-0.5">
                    Click the <strong>Flip</strong> (<RotateCw className="inline h-3 w-3" />) icon at top-left to read bio & flags. Click <strong>Zoom</strong> (<Maximize2 className="inline h-3 w-3" />) for high-res art. Use the bottom icons for instant one-click voting.
                  </p>
                </div>
              </div>

              {/* 3. Keyboard Keycaps Component INSIDE the Modal */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0">⌨️</span>
                  <span className="font-bold text-pink-300 block text-xs">Tactile Keyboard Keycaps</span>
                </div>
                <TactileKeycaps
                  onPass={() => {
                    handleVote('pass');
                    setIsHowToPlayOpen(false);
                  }}
                  onSmash={() => {
                    handleVote('smash');
                    setIsHowToPlayOpen(false);
                  }}
                  onStats={() => {
                    setIsHowToPlayOpen(false);
                    if (currentCharacter) setSelectedStatCharacter(currentCharacter);
                  }}
                  onReset={() => {
                    setIsHowToPlayOpen(false);
                    setIsResetConfirmOpen(true);
                  }}
                  dict={dict}
                  className="my-1"
                />
              </div>

              {/* 4. Background Lore & Atmosphere */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-xl shrink-0">🌌</span>
                <div>
                  <span className="font-bold text-pink-300 block text-xs">Atmospheric Background & Music</span>
                  <p className="text-slate-400 leading-relaxed pt-0.5">
                    Hover over scattered text in the background to inspect quotes and traits with glowing animations. Click <strong>BGM</strong> or press <kbd className="px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">B</kbd> to enjoy dark sensual synth music!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(false)}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Got It, Let&apos;s Play!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <SmashLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        items={leaderboardItems}
        userSmashes={userSmashesList}
        editionName={activeRoster.name || selectedRosterSlug}
        isAuthenticated={isAuthenticated}
        onSelectCharacter={(char) => setSelectedStatCharacter(char)}
        locale={locale}
        dict={dict}
      />

      <CharacterStatsModal
        isOpen={Boolean(selectedStatCharacter)}
        onClose={() => setSelectedStatCharacter(null)}
        character={selectedStatCharacter}
        stats={selectedStatCharacter ? selectedStatCharacter.stat : undefined}
        locale={locale}
        dict={dict}
      />

      <RomancePersonaModal
        isOpen={isPersonaOpen}
        onClose={() => setIsPersonaOpen(false)}
        votes={voteHistory as any}
        onResetAll={() => setIsResetConfirmOpen(true)}
        locale={locale}
        dict={dict}
      />

      {/* RESET CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsResetConfirmOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-rose-500/40 bg-slate-900 p-6 space-y-4 shadow-2xl text-center"
          >
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-100">Reset All Votes?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will clear your voting history for <span className="text-pink-300 font-bold">{activeRoster.name || selectedRosterSlug}</span> and restore all {totalEditionCount} candidates to your deck.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAllVotes}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black text-white transition-colors shadow-lg cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
