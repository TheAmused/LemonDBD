'use client';
// frontend/src/components/smash-or-pass/hub/useSmashDeck.ts
import { useCallback, useEffect, useState } from 'react';
import { fetchLeaderboard, fetchRosterFeed } from '@/services/smashApi';
import type { EntityItem, LeaderboardItem, SmashRosterStoreState } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { shuffleArray } from '@/utils/shuffleArray';
import { customEntityToEntityItem, isLocalRosterSlug, localRosterIdFromSlug } from '@/utils/smashOrPass/localRoster';
import { SmashSounds } from '../SmashSoundEffects';

const NO_LEADERBOARD: LeaderboardItem[] = [];

interface UseSmashDeckOptions {
  selectedRosterSlug: string;
  customRosterStore: SmashRosterStoreState;
  /** Called once a feed load settles, success or not, so a stale exit animation cannot linger. */
  onFeedSettled: () => void;
}

/** The shuffled stack of candidates for the active roster, the filters on it, and its leaderboard. */
export function useSmashDeck({ selectedRosterSlug, customRosterStore, onFeedSettled }: UseSmashDeckOptions) {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [deck, setDeck] = useState<EntityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalRemaining, setTotalRemaining] = useState<number>(0);
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>([]);
  const [leaderboardFor, setLeaderboardFor] = useState<string | null>(null);

  // No leaderboards for custom rosters (see the smash-or-pass roster creator plan's explicit
  // non-goals) -- there is no shared vote table row for a roster the backend has never heard of.
  const isLocal = isLocalRosterSlug(selectedRosterSlug);
  const shownLeaderboard = isLocal || leaderboardFor !== selectedRosterSlug ? NO_LEADERBOARD : leaderboardItems;

  const loadLeaderboard = useCallback((): Promise<void> => {
    if (isLocalRosterSlug(selectedRosterSlug)) return Promise.resolve();
    const slug = selectedRosterSlug;
    return fetchLeaderboard(slug).then(
      (items) => {
        if (!items) return;
        setLeaderboardItems(items);
        setLeaderboardFor(slug);
      },
      () => {
        // Best-effort: failure here is non-fatal.
      }
    );
  }, [selectedRosterSlug]);

  /** The shuffled deck for the roster and filters, or null when the feed could not be read. */
  const fetchDeck = useCallback((): Promise<{ deck: EntityItem[]; remaining: number } | null> => {
    // A local roster has no server-side feed (no session, no vote table row to filter
    // "already voted" candidates against) -- it is simply its own entity list, played in full
    // every time, shuffled the same way an API feed's entities are.
    if (isLocalRosterSlug(selectedRosterSlug)) {
      const id = localRosterIdFromSlug(selectedRosterSlug);
      const stored = customRosterStore.custom[id];
      const entities = (stored?.entities ?? [])
        .filter((e) => roleFilter === 'all' || e.role === roleFilter)
        .filter((e) => genderFilter === 'all' || e.gender === genderFilter)
        .map((e, i) => customEntityToEntityItem(selectedRosterSlug, e, i));
      const shuffled = shuffleArray(entities);
      return Promise.resolve({ deck: shuffled, remaining: shuffled.length });
    }
    return fetchRosterFeed(selectedRosterSlug, {
      role: roleFilter !== 'all' ? roleFilter : undefined,
      gender: genderFilter !== 'all' ? genderFilter : undefined,
      limit: 300,
    }).then(
      (feed) =>
        feed && feed.entities
          ? { deck: shuffleArray(feed.entities), remaining: feed.total_remaining ?? feed.entities.length }
          : null,
      () => null
    );
  }, [selectedRosterSlug, roleFilter, genderFilter, customRosterStore]);

  const showDeck = useCallback((next: { deck: EntityItem[]; remaining: number } | null) => {
    if (!next) return;
    setDeck(next.deck);
    setCurrentIndex(0);
    setTotalRemaining(next.remaining);
  }, []);

  // The deck is loading until the feed for the current roster and filters has settled (a manual
  // reload shows as loading too).
  const [loadedWith, setLoadedWith] = useState<typeof fetchDeck | null>(null);
  const [reloading, setReloading] = useState(false);
  const loading = reloading || loadedWith !== fetchDeck;

  const loadFeed = useCallback(async () => {
    setReloading(true);
    try {
      showDeck(await fetchDeck());
    } finally {
      setReloading(false);
      onFeedSettled();
    }
  }, [fetchDeck, showDeck, onFeedSettled]);

  // Must stay separate from the vote sync (useSmashVotes): a feed load reshuffles the deck, and
  // `syncVotes` is rebuilt on every auth transition, so sharing one effect reordered the deck
  // under the user on load.
  useEffect(() => {
    let cancelled = false;
    void fetchDeck()
      .then((next) => !cancelled && showDeck(next))
      .finally(() => {
        if (cancelled) return;
        setLoadedWith(() => fetchDeck);
        onFeedSettled();
      });
    return () => {
      cancelled = true;
    };
  }, [fetchDeck, showDeck, onFeedSettled]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

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

  const shuffleDeck = useCallback(() => {
    setDeck((prev) => shuffleArray(prev));
    setCurrentIndex(0);
    SmashSounds.playShuffleSound();
  }, []);

  /** The top card has left: the next one is up. */
  const advance = useCallback(() => {
    setCurrentIndex((idx) => idx + 1);
    setTotalRemaining((r) => Math.max(0, r - 1));
  }, []);

  const setFilter = useCallback((type: 'role' | 'gender', value: string) => {
    if (type === 'role') setRoleFilter(value);
    if (type === 'gender') setGenderFilter(value);
  }, []);

  const resetFilters = useCallback(() => {
    setRoleFilter('all');
    setGenderFilter('all');
  }, []);

  return {
    roleFilter,
    genderFilter,
    setFilter,
    resetFilters,
    deck,
    currentIndex,
    totalRemaining,
    loading,
    leaderboardItems: shownLeaderboard,
    setLeaderboardItems,
    loadFeed,
    loadLeaderboard,
    currentCharacter,
    nextCharacter,
    thirdCharacter,
    shuffleDeck,
    advance,
  };
}
