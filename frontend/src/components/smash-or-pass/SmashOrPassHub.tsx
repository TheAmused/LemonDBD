'use client';
// frontend/src/components/smash-or-pass/SmashOrPassHub.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
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
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@/components/common/Tooltip';
import { CharacterCard } from './CharacterCard';
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
  fetchUserVotes,
  syncSessionVotes as apiSyncSessionVotes,
} from '@/services/smashApi';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';

// Dynamic client-side imports for heavy visual layers and interactive modals
const SmashAnimations = dynamic(
  () => import('./SmashAnimations').then((m) => m.SmashAnimations),
  { ssr: false }
);

const InteractiveDragBackground = dynamic(
  () => import('./InteractiveDragBackground').then((m) => m.InteractiveDragBackground),
  { ssr: false }
);

const FloatingLoreScattered = dynamic(
  () => import('./FloatingLoreScattered').then((m) => m.FloatingLoreScattered),
  { ssr: false }
);

const TactileKeycaps = dynamic(
  () => import('./TactileKeycaps').then((m) => m.TactileKeycaps),
  { ssr: false }
);

const SmashLeaderboardModal = dynamic(
  () => import('./SmashLeaderboardModal').then((m) => m.SmashLeaderboardModal),
  { ssr: false }
);

const CharacterStatsModal = dynamic(
  () => import('./CharacterStatsModal').then((m) => m.CharacterStatsModal),
  { ssr: false }
);

const RomancePersonaModal = dynamic(
  () => import('./RomancePersonaModal').then((m) => m.RomancePersonaModal),
  { ssr: false }
);

const RosterSelectModal = dynamic(
  () => import('./RosterSelectModal').then((m) => m.RosterSelectModal),
  { ssr: false }
);

interface SmashOrPassHubProps {
  dict?: Dictionary;
  locale?: string;
}

export const SmashOrPassHub: React.FC<SmashOrPassHubProps> = ({ dict, locale = 'en' }) => {
  const backendBase = getBackendBaseUrl();
  const { user, token, isAuthenticated } = useAuth();

  // Rosters State (Database-Driven)
  const [rosters, setRosters] = useState<RosterItem[]>([]);
  const [selectedRosterSlug, setSelectedRosterSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dbd_smash_selected_roster') || 'canon';
    }
    return 'canon';
  });

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

  // Voting History & Session State (Persisted in localStorage & synced with backend)
  const [voteHistory, setVoteHistory] = useState<
    Array<{ character: EntityItem; vote: 'smash' | 'pass'; timestamp: number }>
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRoster = localStorage.getItem('dbd_smash_selected_roster') || 'canon';
        const raw = localStorage.getItem(`dbd_smash_votes_${storedRoster}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const sessionSmashes = useMemo(() => {
    return voteHistory.filter((v) => v.vote === 'smash').length;
  }, [voteHistory]);

  const sessionPasses = useMemo(() => {
    return voteHistory.filter((v) => v.vote === 'pass').length;
  }, [voteHistory]);

  // Animation Triggers
  const [animTrigger, setAnimTrigger] = useState<{
    type: 'smash' | 'pass' | null;
    key: number;
    originX?: number;
    originY?: number;
  }>({ type: null, key: 0 });

  // Modals & UI Controls
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [rosterSwitchEffect, setRosterSwitchEffect] = useState<string | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [selectedStatCharacter, setSelectedStatCharacter] = useState<EntityItem | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(SmashSounds.getIsMuted());
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(SmashSounds.getIsBgmPlaying());
  const [isSoundActive, setIsSoundActive] = useState<boolean>(!SmashSounds.getIsMuted());

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

  const getRosterCover = useCallback((r: RosterItem) => {
    if (r.cover_image_url) {
      return r.cover_image_url.startsWith('http')
        ? r.cover_image_url
        : `${getBackendBaseUrl()}${r.cover_image_url}`;
    }
    return `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.webp`;
  }, []);

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
        limit: 300,
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

  // Synchronize vote history from LocalStorage & Backend
  const syncVotes = useCallback(async (rosterSlug: string) => {
    let currentVotes: Array<{ character: EntityItem; vote: 'smash' | 'pass'; timestamp: number }> = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`dbd_smash_votes_${rosterSlug}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) currentVotes = parsed;
        }
      } catch {}
    }

    // If user is authenticated, migrate any guest session votes to user account
    if (isAuthenticated || token || user?.id) {
      try {
        await apiSyncSessionVotes(rosterSlug);
      } catch (err) {
        console.debug('Error syncing guest session votes:', err);
      }
    }

    try {
      const backendVotes = await fetchUserVotes(rosterSlug);
      if (backendVotes && backendVotes.length > 0) {
        const existingSlugs = new Set(currentVotes.map((v) => v.character?.slug || (v as any).slug));
        const merged = [...currentVotes];

        backendVotes.forEach((bv) => {
          if (!existingSlugs.has(bv.character_slug)) {
            const voteType: 'smash' | 'pass' = bv.vote_type === 'pass' ? 'pass' : 'smash';
            merged.push({
              character: (bv.entity || {
                id: bv.character_slug,
                slug: bv.character_slug,
                name: (bv as any).character_name || bv.character_slug,
                role: (bv as any).role || 'Survivor',
                gender: (bv as any).gender || 'female',
                order_index: 0,
                is_active: true,
                roster_id: rosterSlug,
              }) as EntityItem,
              vote: voteType,
              timestamp: bv.created_at ? new Date(bv.created_at).getTime() : Date.now(),
            });
            existingSlugs.add(bv.character_slug);
          }
        });

        currentVotes = merged;
      }
    } catch (err) {
      console.debug('Error syncing backend user votes:', err);
    }

    if (typeof window !== 'undefined' && currentVotes.length > 0) {
      try {
        localStorage.setItem(`dbd_smash_votes_${rosterSlug}`, JSON.stringify(currentVotes));
      } catch {}
    }
    setVoteHistory(currentVotes);
  }, [isAuthenticated, token, user?.id]);

  // Initial Load
  useEffect(() => {
    loadRosters();
  }, [loadRosters]);

  useEffect(() => {
    loadFeed();
    loadLeaderboard();
    syncVotes(selectedRosterSlug);
  }, [loadFeed, loadLeaderboard, syncVotes, selectedRosterSlug]);

  // Auto-resume audio on first user gesture if user has audio enabled
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFirstUserGesture = () => {
      SmashSounds.handleUserInteraction();
    };

    window.addEventListener('pointerdown', handleFirstUserGesture, { once: true });
    window.addEventListener('keydown', handleFirstUserGesture, { once: true });
    window.addEventListener('touchstart', handleFirstUserGesture, { once: true });
    window.addEventListener('click', handleFirstUserGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
      window.removeEventListener('click', handleFirstUserGesture);
    };
  }, []);

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
  const nextCharacter = deck[currentIndex + 1] || null;
  const thirdCharacter = deck[currentIndex + 2] || null;

  // Preload next 3 images in queue
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloads = deck.slice(currentIndex + 1, currentIndex + 4);
    preloads.forEach((item) => {
      if (item.media_url) {
        const img = new Image();
        img.src = item.media_url.startsWith('http')
          ? item.media_url
          : `${getBackendBaseUrl()}${item.media_url}`;
      }
    });
  }, [currentIndex, deck]);

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

  const getRosterDisplayName = useCallback(
    (r: { slug: string; name?: string }) => {
      const locName = (dict?.smashOrPass?.rosters as any)?.[r.slug]?.name;
      if (locName) return locName;
      if (r.slug === 'canon') return locale === 'pl' ? 'Dead by Daylight: Kanon Mgły' : 'Dead by Daylight: Fog Canon';
      if (r.slug === 'hooked_on_you') return locale === 'pl' ? 'Hooked on You: Romans na Wyspie' : 'Hooked on You: Island Romance';
      if (r.slug === 'legendary_cosplay') return locale === 'pl' ? 'Legendarne Skórki i Kolaboracje' : 'Legendary Skins & Collabs';
      if (r.slug === 'cyberpunk_2077') return locale === 'pl' ? 'Cyberpunk Mgła 2077' : 'Cyberpunk Fog 2077';
      if (r.slug === 'anime_manga') return locale === 'pl' ? 'Estetyka Anime / Mangi' : 'Fog Anime / Manga Aesthetic';
      if (r.slug === 'gothic_eldritch') return locale === 'pl' ? 'Wiktoriańskie i Gotyckie Legendy' : 'Victorian & Gothic Eldritch';
      return r.name || r.slug;
    },
    [dict, locale]
  );

  // 5. Handle Vote (Smash or Pass) with Database API & Local Persistence
  const handleVote = useCallback(
    async (vote: 'smash' | 'pass', origin?: { x: number; y: number }) => {
      if (!currentCharacter || isExiting) return;

      if (vote === 'smash') {
        SmashSounds.playSmashSound();
      } else {
        SmashSounds.playPassSound();
      }

      setAnimTrigger((prev) => ({
        type: vote,
        key: prev.key + 1,
        originX: origin?.x,
        originY: origin?.y,
      }));

      const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
      let initialOffset = { x: 0, y: 0 };
      if (dragPhysics.x !== 0 || dragPhysics.y !== 0) {
        initialOffset = {
          x: dragPhysics.x > 0 ? screenWidth * 1.25 : -screenWidth * 1.25,
          y: dragPhysics.y * 1.1,
        };
      } else {
        initialOffset =
          vote === 'smash'
            ? { x: screenWidth * 1.25, y: -20 }
            : { x: -screenWidth * 1.25, y: 20 };
      }

      setIsExiting(true);
      setExitVote(vote);
      setExitOffset(initialOffset);

      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      // Smooth 480ms synchronized exit curve
      exitTimeoutRef.current = setTimeout(() => {
        handleExitComplete();
      }, 480);

      const newEntry = { character: currentCharacter, vote, timestamp: Date.now() };
      setVoteHistory((prev) => {
        const filtered = prev.filter(
          (v) => (v.character?.slug || (v as any).slug) !== currentCharacter.slug
        );
        const updated = [...filtered, newEntry];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              `dbd_smash_votes_${selectedRosterSlug}`,
              JSON.stringify(updated)
            );
          } catch {}
        }
        return updated;
      });

      // Call database API to cast vote
      try {
        const voteResponse = await apiCastVote(currentCharacter.id, vote, currentCharacter.slug);
        const entityData = voteResponse?.data || (voteResponse as any);
        if (entityData) {
          setLeaderboardItems((prev) => {
            return prev.map((item) => {
              const slug = item.slug || item.character_slug;
              if (slug === currentCharacter.slug || item.id === currentCharacter.id) {
                const sCount = entityData.smash_count ?? item.smash_count ?? 0;
                const pCount = entityData.pass_count ?? item.pass_count ?? 0;
                const ssCount = entityData.super_smash_count ?? item.super_smash_count ?? 0;
                const tVotes = entityData.total_votes ?? item.total_votes ?? (sCount + pCount + ssCount);
                const sRate = entityData.smash_rate ?? item.smash_rate ?? 0;

                return {
                  ...item,
                  smash_count: sCount,
                  pass_count: pCount,
                  super_smash_count: ssCount,
                  total_votes: tVotes,
                  smash_rate: sRate,
                  stat: item.stat
                    ? {
                        ...item.stat,
                        smash_count: sCount,
                        pass_count: pCount,
                        super_smash_count: ssCount,
                        total_votes: tVotes,
                        smash_rate: sRate,
                      }
                    : null,
                };
              }
              return item;
            });
          });
        }
        await loadLeaderboard();
      } catch (err) {
        console.debug('Failed to cast vote to database:', err);
      }
    },
    [currentCharacter, isExiting, dragPhysics, handleExitComplete, selectedRosterSlug, loadLeaderboard]
  );

  // 6. Reset All Votes via Database API
  const handleResetAllVotes = useCallback(async () => {
    setIsResetConfirmOpen(false);

    try {
      if (isAuthenticated || token || user?.id) {
        await apiResetUserVotes(selectedRosterSlug);
      }
      await apiResetSessionVotes(selectedRosterSlug);
    } catch (err) {
      console.error('Failed to reset votes on backend database:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`dbd_smash_votes_${selectedRosterSlug}`);
      } catch {}
    }

    setVoteHistory([]);
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
      if (e.key === 'm' || e.key === 'M' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        const active = SmashSounds.toggleMasterSound();
        setIsSoundActive(active);
        setIsMuted(!active);
        setIsBgmPlaying(active);
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

  // Auto-refresh leaderboard when the Hall of Fame modal opens
  useEffect(() => {
    if (isLeaderboardOpen) {
      loadLeaderboard();
    }
  }, [isLeaderboardOpen, loadLeaderboard]);

  const handleToggleMasterSound = () => {
    const active = SmashSounds.toggleMasterSound();
    setIsSoundActive(active);
    setIsMuted(!active);
    setIsBgmPlaying(active);
  };

  const userSmashesList = useMemo(() => {
    return voteHistory
      .filter((v) => v.vote === 'smash')
      .map((v) => ({
        slug: v.character?.slug || (v as any).slug || (v as any).character_slug || '',
        vote: v.vote,
        timestamp: v.timestamp,
      }));
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
  const allRolesLabel = dict?.smashOrPass?.filters?.allRoles || dict?.smashOrPass?.allRoles || 'All Roles';
  const survivorsLabel = dict?.smashOrPass?.filters?.survivors || dict?.smashOrPass?.survivors || 'Survivors';
  const killersLabel = dict?.smashOrPass?.filters?.killers || dict?.smashOrPass?.killers || 'Killers';
  const allGendersLabel = dict?.smashOrPass?.filters?.allGenders || dict?.smashOrPass?.allGenders || 'All Genders';
  const femaleOnlyLabel = dict?.smashOrPass?.filters?.femaleOnly || dict?.smashOrPass?.femaleOnly || 'Female';
  const maleOnlyLabel = dict?.smashOrPass?.filters?.maleOnly || dict?.smashOrPass?.maleOnly || 'Male';
  const monstersLabel = dict?.smashOrPass?.filters?.monsters || dict?.smashOrPass?.monsters || 'Monsters & Eldritch';
  const leaderboardLabel = dict?.smashOrPass?.modals?.leaderboardTitle || dict?.smashOrPass?.leaderboard || 'Hall of Fame';
  const hudLabels: any = dict?.smashOrPass?.hud || {};

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-start space-y-3 pb-12 overflow-hidden">
      {/* Interactive Reactive Background */}
      <Suspense fallback={null}>
        <InteractiveDragBackground
          dragX={dragPhysics.x}
          dragY={dragPhysics.y}
          isDragging={dragPhysics.isDragging}
          actionTrigger={animTrigger.type}
          triggerKey={animTrigger.key}
          isPaused={areModalsOpen}
        />
      </Suspense>

      {/* Scattered Ambient Lore Wings Flanking the Candidate Card */}
      <Suspense fallback={null}>
        <FloatingLoreScattered character={currentCharacter} locale={locale} dict={dict} />
      </Suspense>

      {/* Particle & Visual Overlay Animation Engine */}
      <Suspense fallback={null}>
        <SmashAnimations
          triggerType={animTrigger.type}
          triggerKey={animTrigger.key}
          originX={animTrigger.originX}
          originY={animTrigger.originY}
          dict={dict}
        />
      </Suspense>

      {/* ========================================================================= */}
      {/* REDESIGNED UNIFIED COMMAND DOCK (LEFT STATS | CENTER ROSTER | RIGHT ICONS) */}
      {/* ========================================================================= */}
      <header className="relative z-20 mx-auto w-full max-w-6xl rounded-3xl bg-zinc-950/85 border border-pink-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(255,0,85,0.08)] backdrop-blur-2xl p-3.5 sm:p-4 md:p-5 space-y-3.5 transition-all cockpit-neon-pulse">
        {/* MAIN ROW: Left Stats + Centered Roster Pill + Right Action Cluster */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
          {/* LEFT: Live Session Telemetry Capsule */}
          <div className="flex items-center justify-center lg:justify-start w-full lg:w-auto order-2 lg:order-1 shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs sm:text-sm font-mono shadow-inner">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Layers className="h-4 w-4 text-cyan-400/90" />
                <span className="text-zinc-100 font-black text-sm sm:text-base">{remainingInDeck}</span>
                <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                  {hudLabels.left || (locale === 'pl' ? 'pozostało' : 'left')}
                </span>
              </span>
              <span className="text-zinc-700">{dict?.smashOrPass?.pipeSeparator || '|'}</span>
              <span className="flex items-center gap-1.5 text-[#ff0055] font-black text-xs sm:text-sm">
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-[#ff0055]" />
                <span>{sessionSmashes}</span>
              </span>
              <span className="text-zinc-700">{dict?.smashOrPass?.pipeSeparator || '|'}</span>
              <span className="flex items-center gap-1.5 text-slate-400 font-black text-xs sm:text-sm">
                <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                <span>{sessionPasses}</span>
              </span>
              <span className="text-zinc-700">{dict?.smashOrPass?.pipeSeparator || '|'}</span>
              <span className="text-amber-300 font-black text-xs sm:text-sm tracking-wide">
                {sessionSmashRate}{dict?.smashOrPass?.percentSign || '%'}
              </span>
            </div>
          </div>

          {/* CENTER: Heart-Flanked Dynamic Roster Selector */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full lg:w-auto order-1 lg:order-2">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-[#ff0055] fill-[#ff0055] animate-pulse drop-shadow-[0_0_12px_rgba(255,0,85,0.9)] shrink-0" />

            <button
              type="button"
              onClick={() => setIsRosterModalOpen(true)}
              className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-2xl bg-zinc-900/95 border border-pink-500/50 hover:border-[#ff0055] hover:shadow-[0_0_25px_rgba(255,0,85,0.4)] text-xs sm:text-sm font-mono font-bold text-pink-100 transition-all cursor-pointer group shrink-0 touch-manipulation"
            >
              <span className="relative flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg overflow-hidden border border-pink-500/60 shrink-0">
                <img
                  src={getRosterCover(activeRoster)}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${getBackendBaseUrl()}/static/avatars/survivors/sable_ward.webp`;
                  }}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="truncate max-w-[150px] sm:max-w-[220px] text-zinc-100 group-hover:text-white font-black tracking-wide">
                {getRosterDisplayName(activeRoster)}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-pink-500/25 text-pink-300 text-[10px] sm:text-xs font-black">
                {activeRoster.entity_count ?? activeRoster.character_count ?? totalRemaining ?? deck.length}
              </span>
              <ChevronDown className="h-4 w-4 text-pink-400 group-hover:translate-y-0.5 transition-transform" />
            </button>

            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-[#ff0055] fill-[#ff0055] animate-pulse drop-shadow-[0_0_12px_rgba(255,0,85,0.9)] shrink-0" />
          </div>

          {/* RIGHT: Action Cluster (Icons with Tooltips and >=44px Touch Targets) */}
          <div className="flex items-center justify-center lg:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto order-3 shrink-0 flex-wrap">
            {/* Filter Settings Drawer Toggle */}
            <Tooltip
              title={dict?.smashOrPass?.tooltips?.filter || 'Filter Candidates'}
              description={dict?.smashOrPass?.tooltips?.filterDesc || 'Filter by survivor/killer role and character gender.'}
              placement="bottom"
            >
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
                aria-label={dict?.smashOrPass?.tooltips?.filter || 'Filter Candidates'}
                className={`relative flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 touch-manipulation ${
                  isFilterDrawerOpen || roleFilter !== 'all' || genderFilter !== 'all'
                    ? 'bg-pink-500/20 border-pink-500/60 text-pink-300 shadow-[0_0_14px_rgba(255,0,85,0.4)]'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4 sm:h-4 sm:w-4" />
                {(roleFilter !== 'all' || genderFilter !== 'all') && (
                  <span className="absolute 1.5 sm:-top-0.5 1.5 sm:-right-0.5 h-2.5 w-2.5 rounded-full bg-[#ff0055] ring-2 ring-zinc-950" />
                )}
              </button>
            </Tooltip>

            {/* Dynamic Sound Toggle */}
            <Tooltip
              title={isSoundActive ? (dict?.smashOrPass?.tooltips?.muteAudio || 'Mute Audio (M / B)') : (dict?.smashOrPass?.tooltips?.unmuteAudio || 'Enable Audio (M / B)')}
              description={isSoundActive ? (dict?.smashOrPass?.tooltips?.muteAudioDesc || 'Mute all background music and sound effects.') : (dict?.smashOrPass?.tooltips?.unmuteAudioDesc || 'Enable dark synth ambience and sound effects.')}
              placement="bottom"
            >
              <button
                type="button"
                onClick={handleToggleMasterSound}
                aria-label={isSoundActive ? (dict?.smashOrPass?.tooltips?.muteAudio || '') : (dict?.smashOrPass?.tooltips?.unmuteAudio || '')}
                className={`flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all cursor-pointer hover:scale-105 active:scale-95 touch-manipulation ${
                  isSoundActive
                    ? 'bg-rose-950/90 border-[#ff0055] text-pink-300 shadow-[0_0_16px_rgba(255,0,85,0.5)]'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {isSoundActive ? <Volume2 className="h-4 w-4 sm:h-4 sm:w-4 text-pink-400 animate-pulse" /> : <VolumeX className="h-4 w-4 sm:h-4 sm:w-4" />}
              </button>
            </Tooltip>

            {/* Archetype Modal */}
            <Tooltip
              title={dict?.smashOrPass?.modals?.personaTitle || 'Trial Romance Archetype'}
              description={dict?.smashOrPass?.tooltips?.archetypeDesc || 'Discover your personal dating archetype based on your voting tendencies.'}
              placement="bottom"
            >
              <button
                type="button"
                onClick={() => setIsPersonaOpen(true)}
                aria-label={dict?.smashOrPass?.tooltips?.archetype || dict?.smashOrPass?.modals?.personaTitle || ''}
                className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-pink-500/15 border border-pink-500/30 hover:border-pink-500/60 text-pink-300 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 touch-manipulation"
              >
                <Sparkles className="h-4 w-4 sm:h-4 sm:w-4 text-pink-400" />
              </button>
            </Tooltip>

            {/* Hall of Fame Leaderboard Modal */}
            <Tooltip
              title={dict?.smashOrPass?.modals?.leaderboardTitle || 'Hall of Fame'}
              description={dict?.smashOrPass?.tooltips?.leaderboardDesc || 'View community rankings and smash statistics across the realm.'}
              placement="bottom"
            >
              <button
                type="button"
                onClick={() => setIsLeaderboardOpen(true)}
                aria-label={dict?.smashOrPass?.tooltips?.leaderboard || dict?.smashOrPass?.modals?.leaderboardTitle || ''}
                className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 touch-manipulation"
              >
                <Trophy className="h-4 w-4 sm:h-4 sm:w-4 text-amber-400" />
              </button>
            </Tooltip>

            {/* Shuffle */}
            <Tooltip
              title={dict?.smashOrPass?.tooltips?.shuffle || 'Shuffle Remaining'}
              description={dict?.smashOrPass?.tooltips?.shuffleDesc || 'Randomize the remaining candidates in your deck.'}
              placement="bottom"
            >
              <button
                type="button"
                onClick={shuffleDeck}
                aria-label={dict?.smashOrPass?.tooltips?.shuffle || ''}
                className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer hover:scale-105 active:scale-95 touch-manipulation"
              >
                <Shuffle className="h-4 w-4 sm:h-4 sm:w-4" />
              </button>
            </Tooltip>

            {/* Reset */}
            <Tooltip
              title={dict?.smashOrPass?.tooltips?.resetAllVotes || 'Reset Voting Data'}
              description={dict?.smashOrPass?.tooltips?.resetDesc || 'Clear your votes and restore all candidate cards.'}
              placement="bottom"
            >
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                aria-label={dict?.smashOrPass?.tooltips?.resetAllVotes || ''}
                className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer hover:scale-105 active:scale-95 touch-manipulation"
              >
                <Trash2 className="h-4 w-4 sm:h-4 sm:w-4" />
              </button>
            </Tooltip>

            {/* How to Play */}
            <Tooltip
              title={dict?.smashOrPass?.tooltips?.howToPlay || 'How to Play'}
              description={dict?.smashOrPass?.tooltips?.howToPlayDesc || 'View keyboard shortcuts, voting controls, and trial mechanics.'}
              placement="bottom"
            >
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(true)}
                aria-label={dict?.smashOrPass?.tooltips?.howToPlay || ''}
                className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer hover:scale-105 active:scale-95 touch-manipulation"
              >
                <HelpCircle className="h-4 w-4 sm:h-4 sm:w-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* FRAMER MOTION EXPANDABLE FILTER DRAWER */}
        <AnimatePresence>
          {isFilterDrawerOpen && (
            <motion.div
              key="smash-filter-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-zinc-800/80 pt-3"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Role Segmented Switch */}
                <div className="flex items-center gap-1 p-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl w-full md:w-auto shadow-inner text-xs font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => handleFilterChange('role', 'all')}
                    className={`flex-1 md:flex-none min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation ${
                      roleFilter === 'all'
                        ? 'bg-gradient-to-r from-rose-600 to-[#ff0055] text-white shadow-[0_0_12px_rgba(255,0,85,0.5)]'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {allRolesLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('role', 'Survivor')}
                    className={`flex-1 md:flex-none min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation ${
                      roleFilter === 'Survivor'
                        ? 'bg-[#00f5d4] text-zinc-950 font-black shadow-[0_0_14px_rgba(0,245,212,0.45)]'
                        : 'text-zinc-400 hover:text-[#00f5d4]'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {survivorsLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('role', 'Killer')}
                    className={`flex-1 md:flex-none min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation ${
                      roleFilter === 'Killer'
                        ? 'bg-[#ff0055] text-white shadow-[0_0_14px_rgba(255,0,85,0.45)]'
                        : 'text-zinc-400 hover:text-[#ff0055]'
                    }`}
                  >
                    <Skull className="h-3.5 w-3.5" />
                    {killersLabel}
                  </button>
                </div>

                {/* Gender Segmented Switch */}
                <div className="flex items-center gap-1 p-1 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl w-full md:w-auto shadow-inner text-xs font-mono font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => handleFilterChange('gender', 'all')}
                    className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer touch-manipulation ${
                      genderFilter === 'all'
                        ? 'bg-zinc-800 text-white border border-zinc-700 shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {allGendersLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('gender', 'female')}
                    className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer touch-manipulation ${
                      genderFilter === 'female'
                        ? 'bg-pink-600 text-white shadow-[0_0_12px_rgba(219,39,119,0.45)]'
                        : 'text-zinc-400 hover:text-pink-300'
                    }`}
                  >
                    {femaleOnlyLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('gender', 'male')}
                    className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer touch-manipulation ${
                      genderFilter === 'male'
                        ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(8,145,178,0.45)]'
                        : 'text-zinc-400 hover:text-cyan-300'
                    }`}
                  >
                    {maleOnlyLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFilterChange('gender', 'monster_other')}
                    className={`min-h-[44px] sm:min-h-[36px] flex items-center justify-center px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer touch-manipulation ${
                      genderFilter === 'monster_other'
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.45)]'
                        : 'text-zinc-400 hover:text-purple-300'
                    }`}
                  >
                    {monstersLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN INTERACTIVE ARENA WITH MULTI-CARD STACK QUEUE */}
      <main className="relative flex-1 flex flex-col items-center justify-center my-2 z-20 pointer-events-none">
        {loading ? (
          <div className="relative flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px] pointer-events-auto select-none animate-pulse">
            <div className="w-[88vw] max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-[9/14] sm:aspect-[9/15] rounded-[32px] sm:rounded-[36px] bg-zinc-950 border-2 border-pink-500/30 flex flex-col items-center justify-center p-6 space-y-4 shadow-[0_0_35px_rgba(255,0,85,0.15)]">
              <Heart className="h-12 w-12 text-rose-500 fill-rose-500/30 animate-pulse" />
              <span className="text-xs font-mono text-zinc-300 text-center font-semibold">
                {dict?.smashOrPass?.loadingRosterPrefix || 'Loading'} {activeRoster.name || selectedRosterSlug} {dict?.smashOrPass?.loadingRosterSuffix || 'from Database...'}
              </span>
              <div className="h-1.5 w-32 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-[#ff0055] animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>
          </div>
        ) : currentCharacter ? (
          <div className="relative flex flex-col items-center justify-center pointer-events-auto min-h-[460px] sm:min-h-[520px]">
            {/* CARD 3 IN QUEUE (DEPTH 2 - SMOOTH ENTER & ELEVATION) */}
            {thirdCharacter && (
              <div
                key={`queue-3-${thirdCharacter.id || thirdCharacter.slug}`}
                className="absolute inset-0 flex items-center justify-center pointer-events-none anim-card-queue-enter"
                style={{
                  transform: dragPhysics.isDragging
                    ? `scale(${0.86 + Math.min(0.07, Math.abs(dragPhysics.x) / 1200)}) translateY(${Math.max(14, 28 - Math.abs(dragPhysics.x) * 0.025)}px)`
                    : isExiting
                      ? 'scale(0.93) translateY(14px)'
                      : 'scale(0.86) translateY(28px)',
                  opacity: dragPhysics.isDragging
                    ? 0.45 + Math.min(0.35, Math.abs(dragPhysics.x) / 1000)
                    : isExiting
                      ? 0.85
                      : 0.45,
                  filter: dragPhysics.isDragging
                    ? `brightness(${0.75 + Math.min(0.15, Math.abs(dragPhysics.x) / 1000)})`
                    : isExiting
                      ? 'brightness(0.9)'
                      : 'brightness(0.75)',
                  zIndex: 5,
                  willChange: 'transform, opacity, filter',
                  transition: isExiting
                    ? 'transform 480ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 480ms cubic-bezier(0.2, 0.9, 0.2, 1), filter 480ms cubic-bezier(0.2, 0.9, 0.2, 1)'
                    : 'transform 240ms ease-out, opacity 240ms ease-out, filter 240ms ease-out',
                }}
              >
                <CharacterCard
                  character={thirdCharacter}
                  onVote={() => { }}
                  isTopCard={false}
                  locale={locale}
                  dict={dict}
                />
              </div>
            )}

            {/* CARD 2 IN QUEUE (DEPTH 1 - DYNAMIC PROMOTION) */}
            {nextCharacter && (
              <div
                key={`queue-2-${nextCharacter.id || nextCharacter.slug}`}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: dragPhysics.isDragging
                    ? `scale(${0.93 + Math.min(0.07, Math.abs(dragPhysics.x) / 900)}) translateY(${Math.max(0, 14 - Math.abs(dragPhysics.x) * 0.035)}px)`
                    : isExiting
                      ? 'scale(1) translateY(0px)'
                      : 'scale(0.93) translateY(14px)',
                  opacity: dragPhysics.isDragging
                    ? 0.85 + Math.min(0.15, Math.abs(dragPhysics.x) / 900)
                    : isExiting
                      ? 1
                      : 0.85,
                  filter: dragPhysics.isDragging
                    ? `brightness(${0.9 + Math.min(0.1, Math.abs(dragPhysics.x) / 900)})`
                    : isExiting
                      ? 'brightness(1)'
                      : 'brightness(0.9)',
                  zIndex: 10,
                  willChange: 'transform, opacity, filter',
                  transition: isExiting
                    ? 'transform 480ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 480ms cubic-bezier(0.2, 0.9, 0.2, 1), filter 480ms cubic-bezier(0.2, 0.9, 0.2, 1)'
                    : 'transform 200ms ease-out, opacity 200ms ease-out, filter 200ms ease-out',
                }}
              >
                <CharacterCard
                  character={nextCharacter}
                  onVote={() => { }}
                  isTopCard={false}
                  locale={locale}
                  dict={dict}
                />
              </div>
            )}

            {/* CARD 1 (ACTIVE TOP CARD) */}
            <div className="relative z-20">
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
          </div>
        ) : (
          // Finished Deck State
          <div className="max-w-md w-full rounded-3xl border border-pink-500/30 bg-[#09090b]/95 p-8 text-center space-y-5 shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400">
              <Heart className="h-8 w-8 fill-pink-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black font-mono text-zinc-100">{dict?.smashOrPass?.empty?.title || 'All Candidates Evaluated!'}</h3>
              <p className="text-xs text-zinc-400">
                {dict?.smashOrPass?.empty?.subtitle || `You have completed all available candidates in ${activeRoster.name || selectedRosterSlug}.`}
              </p>
            </div>

            {/* Session Stats Summary */}
            <div className="grid grid-cols-2 gap-3 py-2 font-mono">
              <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs text-rose-400 font-bold uppercase">{dict?.smashOrPass?.smash || 'Smash'}</span>
                <p className="text-2xl font-black text-zinc-100">{sessionSmashes}</p>
              </div>
              <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs text-zinc-400 font-bold uppercase">{dict?.smashOrPass?.pass || 'Pass'}</span>
                <p className="text-2xl font-black text-zinc-100">{sessionPasses}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPersonaOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs transition-all shadow-lg shadow-rose-950/40 cursor-pointer font-mono"
              >
                <Sparkles className="h-4 w-4" />
                <span>{hudLabels.archetype || 'View Romance Archetype'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-xs transition-all border border-zinc-700 cursor-pointer font-mono"
              >
                <RotateCcw className="h-4 w-4 text-zinc-400" />
                <span>{dict?.smashOrPass?.empty?.resetAction || 'Reset & Play Again'}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/85 backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-pink-500/40 bg-[#09090b] p-6 space-y-5 shadow-2xl text-left text-zinc-100 font-mono"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
                  <Gamepad2 className="h-5 w-5" />
                </span>
                <h3 id="how-to-play-title" className="text-base font-black text-zinc-100">
                  {dict?.smashOrPass?.howToPlayModal?.title || hudLabels.howToPlay || 'How to Play Smash or Pass'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-zinc-300 font-sans">
              {/* 1. Drag / Swipe */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-xl shrink-0">{dict?.smashOrPass?.howToPlayModal?.swipeIcon || '👆'}</span>
                <div>
                  <span className="font-bold text-pink-300 block text-xs font-mono">
                    {dict?.smashOrPass?.howToPlayModal?.swipeTitle || 'Swipe or Drag Cards'}
                  </span>
                  <p className="text-zinc-400 leading-relaxed pt-0.5">
                    {dict?.smashOrPass?.howToPlayModal?.swipeDesc || 'Drag card Right to Smash or drag Left to Pass.'}
                  </p>
                </div>
              </div>

              {/* 2. On-card Tactile Buttons */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-xl shrink-0">{dict?.smashOrPass?.howToPlayModal?.iconsIcon || '🎯'}</span>
                <div>
                  <span className="font-bold text-pink-300 block text-xs font-mono">
                    {dict?.smashOrPass?.howToPlayModal?.iconsTitle || 'On-Card Action Icons'}
                  </span>
                  <p className="text-zinc-400 leading-relaxed pt-0.5">
                    {dict?.smashOrPass?.howToPlayModal?.iconsDesc || 'Click Flip to read bio and memes. Click Zoom for high-res portrait art.'}
                  </p>
                </div>
              </div>

              {/* 3. Keyboard Keycaps Component INSIDE the Modal */}
              <div className="space-y-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl shrink-0">{dict?.smashOrPass?.howToPlayModal?.keycapsIcon || '⌨️'}</span>
                  <span className="font-bold text-pink-300 block text-xs font-mono">
                    {dict?.smashOrPass?.howToPlayModal?.keycapsTitle || 'Tactile Keyboard Keycaps'}
                  </span>
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
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-xl shrink-0">{dict?.smashOrPass?.howToPlayModal?.atmosphereIcon || '🌌'}</span>
                <div>
                  <span className="font-bold text-pink-300 block text-xs font-mono">
                    {dict?.smashOrPass?.howToPlayModal?.atmosphereTitle || 'Atmospheric Background & Music'}
                  </span>
                  <p className="text-zinc-400 leading-relaxed pt-0.5">
                    {dict?.smashOrPass?.howToPlayModal?.atmosphereDesc || 'Hover over background text elements to inspect quotes and lore with glowing effects.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHowToPlayOpen(false)}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold font-mono text-white transition-colors cursor-pointer"
              >
                {dict?.smashOrPass?.howToPlayModal?.letsPlay || "Got It, Let's Play!"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <RosterSelectModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        rosters={rosters}
        selectedRosterSlug={selectedRosterSlug}
        onSelectRoster={(slug) => {
          setSelectedRosterSlug(slug);
          if (typeof window !== 'undefined') {
            localStorage.setItem('dbd_smash_selected_roster', slug);
          }
          setRosterSwitchEffect(slug);
          setTimeout(() => setRosterSwitchEffect(null), 1200);
        }}
        locale={locale}
        dict={dict}
      />

      {/* ROSTER SWITCH STARTING ANIMATION EFFECT */}
      {rosterSwitchEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#ff0055]/15 backdrop-blur-sm animate-pulse" />
          <div className="relative flex flex-col items-center gap-2 p-6 rounded-3xl bg-black/90 border-2 border-[#ff0055] shadow-[0_0_80px_rgba(255,0,85,0.7)] text-center animate-in zoom-in-75 duration-300">
            <Heart className="h-14 w-14 text-[#ff0055] fill-[#ff0055] animate-bounce" />
            <span className="text-xl font-mono font-black tracking-widest text-pink-100 uppercase drop-shadow-[0_0_20px_rgba(255,0,85,0.8)]">
              {getRosterDisplayName({ slug: rosterSwitchEffect })}
            </span>
          </div>
        </div>
      )}

      <SmashLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        items={leaderboardItems}
        userSmashes={userSmashesList}
        editionName={activeRoster.name || selectedRosterSlug}
        isAuthenticated={isAuthenticated}
        onSelectCharacter={(char) => setSelectedStatCharacter(char as unknown as EntityItem)}
        locale={locale}
        dict={dict}
      />

      <CharacterStatsModal
        isOpen={Boolean(selectedStatCharacter)}
        onClose={() => setSelectedStatCharacter(null)}
        character={selectedStatCharacter}
        stats={selectedStatCharacter?.stat ?? undefined}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/85 backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-rose-500/40 bg-[#09090b] p-6 space-y-4 shadow-2xl text-center font-mono"
          >
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1 font-sans">
              <h3 className="text-base font-black font-mono text-zinc-100">
                {dict?.smashOrPass?.modals?.resetConfirmTitle || 'Reset All Votes?'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {dict?.smashOrPass?.modals?.resetConfirmDesc || `This will clear your voting history for ${activeRoster.name || selectedRosterSlug} and restore all candidates to your deck.`}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2 font-mono">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
              >
                {dict?.smashOrPass?.modals?.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleResetAllVotes}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black text-white transition-colors shadow-lg cursor-pointer"
              >
                {dict?.smashOrPass?.modals?.confirm || 'Yes, Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
