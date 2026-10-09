// frontend/src/components/smash-or-pass/hub/useSmashVoting.ts
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { castVote as apiCastVote } from '@/services/smashApi';
import type { EntityItem, LeaderboardItem } from '@/types/smashOrPass';
import { isLocalRosterSlug } from '@/utils/smashOrPass/localRoster';
import { SmashSounds } from '../SmashSoundEffects';
import { applyVoteToLeaderboard } from './leaderboardPatch';
import { exitOffsetFor, CALM_EXIT_MS, type useCardExit } from './useCardExit';

interface UseSmashVotingOptions {
  currentCharacter: EntityItem | null;
  selectedRosterSlug: string;
  exit: ReturnType<typeof useCardExit>;
  /** Runs when the voted card has finished leaving: the next one comes up. */
  onExitComplete: () => void;
  recordVote: (character: EntityItem, vote: 'smash' | 'pass') => void;
  setLeaderboardItems: Dispatch<SetStateAction<LeaderboardItem[]>>;
  loadLeaderboard: () => Promise<void>;
  /** False when the viewer switched effects off: the card fades out gently and a calm heart or skull shows. */
  effectsEnabled: boolean;
}

export interface AnimTrigger {
  type: 'smash' | 'pass' | null;
  key: number;
  originX?: number;
  originY?: number;
}

/** A burst of votes refreshes the leaderboard once, this long after the last one. */
const LEADERBOARD_REFRESH_MS = 1500;

/** Casting a smash or a pass: the sound, the effect, the card's exit, the record, and the backend. */
export function useSmashVoting({
  currentCharacter,
  selectedRosterSlug,
  exit,
  onExitComplete,
  recordVote,
  setLeaderboardItems,
  loadLeaderboard,
  effectsEnabled,
}: UseSmashVotingOptions) {
  const [animTrigger, setAnimTrigger] = useState<AnimTrigger>({ type: null, key: 0 });
  const { isExiting, dragPhysics, beginExit } = exit;

  // Each vote already patches the leaderboard in place; the full re-fetch only reconciles the
  // ranking, so it waits for a pause instead of running (and re-rendering the page) per swipe.
  const loadLeaderboardRef = useRef(loadLeaderboard);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    loadLeaderboardRef.current = loadLeaderboard;
  }, [loadLeaderboard]);
  useEffect(
    () => () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    },
    []
  );
  const scheduleLeaderboardRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void loadLeaderboardRef.current();
    }, LEADERBOARD_REFRESH_MS);
  }, []);

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

      beginExit(vote, exitOffsetFor(vote, dragPhysics), onExitComplete, effectsEnabled ? undefined : CALM_EXIT_MS);
      recordVote(currentCharacter, vote);

      // A local roster's entities were never sent to the backend -- there is no `entity_id`
      // there to vote for, and (per the plan) no leaderboard to update anyway. The vote is
      // already recorded above, purely locally.
      if (isLocalRosterSlug(selectedRosterSlug)) return;

      try {
        const voteResponse = await apiCastVote(currentCharacter.id, vote, currentCharacter.slug);
        const entityData = voteResponse?.data;
        if (entityData) {
          setLeaderboardItems((prev) => applyVoteToLeaderboard(prev, currentCharacter, entityData));
        }
        scheduleLeaderboardRefresh();
      } catch {
        // Best-effort: failure here is non-fatal.
      }
    },
    [currentCharacter, isExiting, dragPhysics, beginExit, onExitComplete, recordVote, selectedRosterSlug, setLeaderboardItems, scheduleLeaderboardRefresh, effectsEnabled]
  );

  return { handleVote, animTrigger };
}
