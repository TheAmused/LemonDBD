// frontend/src/components/smash-or-pass/hub/useSmashDeck.ts
import { useCallback, useEffect, useState } from 'react';
import { fetchLeaderboard, fetchRosterFeed } from '@/services/smashApi';
import type { EntityItem, LeaderboardItem, SmashRosterStoreState } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { shuffleArray } from '@/utils/shuffleArray';
import { customEntityToEntityItem, isLocalRosterSlug, localRosterIdFromSlug } from '@/utils/smashOrPass/localRoster';
import { SmashSounds } from '../SmashSoundEffects';

interface UseSmashDeckOptions {
  selectedRosterSlug: string;
  customRosterStore: SmashRosterStoreState;
  /** Called once a feed load settles, success or not, so a stale exit animation cannot linger. */
  onFeedSettled: () => void;
}

/** The shuffled stack of candidates for the active roster, the filters on it, and its leaderboard. */
export function useSmashDeck({ selectedRosterSlug, customRosterStore, onFeedSettled }: UseSmashDeckOptions) {
  const [roleFilter, setRoleFilter] = useState<'all' | string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | string>('all');
  const [deck, setDeck] = useState<EntityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalRemaining, setTotalRemaining] = useState<number>(0);
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLeaderboard = useCallback(async () => {
    // No leaderboards for custom rosters (see the smash-or-pass roster creator plan's explicit
    // non-goals) -- there is no shared vote table row for a roster the backend has never heard of.
    if (isLocalRosterSlug(selectedRosterSlug)) {
      setLeaderboardItems([]);
      return;
    }
    try {
      const items = await fetchLeaderboard(selectedRosterSlug);
      if (items) {
        setLeaderboardItems(items);
      }
    } catch {
      // Best-effort: failure here is non-fatal.
    }
  }, [selectedRosterSlug]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
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
        setDeck(shuffled);
        setCurrentIndex(0);
        setTotalRemaining(shuffled.length);
        return;
      }

      const feed = await fetchRosterFeed(selectedRosterSlug, {
        role: roleFilter !== 'all' ? roleFilter : undefined,
        gender: genderFilter !== 'all' ? genderFilter : undefined,
        limit: 300,
      });

      if (feed && feed.entities) {
        const shuffled = shuffleArray(feed.entities);
        setDeck(shuffled);
        setCurrentIndex(0);
        setTotalRemaining(feed.total_remaining ?? feed.entities.length);
      }
    } catch {
      // Best-effort: failure here is non-fatal.
    } finally {
      setLoading(false);
      onFeedSettled();
    }
  }, [selectedRosterSlug, roleFilter, genderFilter, customRosterStore, onFeedSettled]);

  // Must stay separate from the vote sync (useSmashVotes): `loadFeed` reshuffles the deck, and
  // `syncVotes` is rebuilt on every auth transition, so sharing one effect reordered the deck
  // under the user on load.
  useEffect(() => {
    loadFeed();
    loadLeaderboard();
  }, [loadFeed, loadLeaderboard]);

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
    leaderboardItems,
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
