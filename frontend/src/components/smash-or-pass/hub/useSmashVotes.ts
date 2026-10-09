// frontend/src/components/smash-or-pass/hub/useSmashVotes.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchUserVotes,
  resetSessionVotes as apiResetSessionVotes,
  resetUserVotes as apiResetUserVotes,
  syncSessionVotes as apiSyncSessionVotes,
} from '@/services/smashApi';
import type { EntityItem } from '@/types/smashOrPass';
import { isLocalRosterSlug } from '@/utils/smashOrPass/localRoster';
import {
  clearStoredVotes,
  flushStoredVotes,
  queueStoredVotes,
  readStoredVotes,
  rememberedRosterSlug,
  voteSlug,
  writeStoredVotes,
  type StoredVote,
} from './voteStorage';

/**
 * The viewer's votes on the active roster: kept in localStorage, and for an official roster
 * merged with what the backend knows (and, once signed in, migrated from the guest session).
 */
export function useSmashVotes(selectedRosterSlug: string) {
  const { user, token, isAuthenticated } = useAuth();
  const [voteHistory, setVoteHistory] = useState<StoredVote[]>(() => readStoredVotes(rememberedRosterSlug()));

  // The latest history, readable straight after a vote without waiting for a render.
  const historyRef = useRef(voteHistory);
  useEffect(() => {
    historyRef.current = voteHistory;
  }, [voteHistory]);
  // A roster switch or leaving the page must not lose votes still waiting to be written.
  useEffect(() => flushStoredVotes, [selectedRosterSlug]);

  const sessionSmashes = useMemo(() => voteHistory.filter((v) => v.vote === 'smash').length, [voteHistory]);
  const sessionPasses = useMemo(() => voteHistory.filter((v) => v.vote === 'pass').length, [voteHistory]);

  const userSmashesList = useMemo(
    () =>
      voteHistory
        .filter((v) => v.vote === 'smash')
        .map((v) => ({ slug: voteSlug(v) || '', vote: v.vote, timestamp: v.timestamp })),
    [voteHistory]
  );

  const syncVotes = useCallback(
    async (rosterSlug: string) => {
      let currentVotes = readStoredVotes(rosterSlug);

      // A local roster has no backend session/account to sync against -- there is no server
      // that has ever heard of it, so its vote history is exactly and only what is already in
      // localStorage, read above.
      if (!isLocalRosterSlug(rosterSlug)) {
        // If user is authenticated, migrate any guest session votes to user account
        if (isAuthenticated || token || user?.id) {
          try {
            await apiSyncSessionVotes(rosterSlug);
          } catch {
            // Best-effort: failure here is non-fatal.
          }
        }

        try {
          const backendVotes = await fetchUserVotes(rosterSlug);
          if (backendVotes && backendVotes.length > 0) {
            const existingSlugs = new Set(currentVotes.map((v) => voteSlug(v)));
            const merged = [...currentVotes];

            backendVotes.forEach((bv) => {
              if (!existingSlugs.has(bv.character_slug)) {
                const voteType: 'smash' | 'pass' = bv.vote_type === 'pass' ? 'pass' : 'smash';
                merged.push({
                  character: (bv.entity || {
                    id: bv.character_slug,
                    slug: bv.character_slug,
                    name: bv.character_name || bv.character_slug,
                    role: bv.role || 'Survivor',
                    gender: bv.gender || 'female',
                    order_index: 0,
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
        } catch {
          // Best-effort: failure here is non-fatal.
        }
      }

      if (currentVotes.length > 0) writeStoredVotes(rosterSlug, currentVotes);
      setVoteHistory(currentVotes);
    },
    // Rebuilt on every auth transition, on purpose: signing in re-runs the sync below.
    [isAuthenticated, token, user?.id]
  );

  useEffect(() => {
    syncVotes(selectedRosterSlug);
  }, [syncVotes, selectedRosterSlug]);

  /** Records a vote locally; a re-vote on the same character replaces the earlier one. */
  const recordVote = useCallback(
    (character: EntityItem, vote: 'smash' | 'pass') => {
      const entry: StoredVote = { character, vote, timestamp: Date.now() };
      const updated = [...historyRef.current.filter((v) => voteSlug(v) !== character.slug), entry];
      historyRef.current = updated;
      setVoteHistory(updated);
      queueStoredVotes(selectedRosterSlug, updated);
    },
    [selectedRosterSlug]
  );

  /** Forgets every vote on the active roster, on the backend too for an official one. */
  const clearVotes = useCallback(async () => {
    if (!isLocalRosterSlug(selectedRosterSlug)) {
      try {
        if (isAuthenticated || token || user?.id) {
          await apiResetUserVotes(selectedRosterSlug);
        }
        await apiResetSessionVotes(selectedRosterSlug);
      } catch (err) {
        console.error('Failed to reset votes on backend database:', err);
      }
    }
    clearStoredVotes(selectedRosterSlug);
    setVoteHistory([]);
  }, [selectedRosterSlug, isAuthenticated, token, user?.id]);

  return { voteHistory, sessionSmashes, sessionPasses, userSmashesList, recordVote, clearVotes };
}
