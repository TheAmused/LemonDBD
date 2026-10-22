// frontend/src/hooks/useUserShowcase.ts
'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DEFAULT_SHOWCASE_STATE,
  GRADE_EMBLEMS,
  PLAYER_TITLES,
  type UserShowcaseState,
  type MainLoadout,
} from '@/types/userShowcase';
import {
  fetchUserShowcase,
  updateUserShowcaseApi,
} from '@/services/userShowcaseApi';
import { getLocalStorage } from '@/utils/safeStorage';
import { getAuthToken } from '@/utils/api';
import { reportCompleteShowcaseRoles } from '@/utils/userShowcaseAnalytics';
import { useOnValueChange } from '@/hooks/useOnValueChange';

const SAVE_RETRY_DELAY_MS = 2000;

export function getShowcaseStorageKey(userId?: number | string | null): string {
  return `lemondbd_showcase_${userId ?? 'guest'}`;
}

export function mergeShowcaseState(partial?: unknown): UserShowcaseState {
  if (!partial || typeof partial !== 'object') {
    return {
      ...DEFAULT_SHOWCASE_STATE,
      survivorMain: {
        ...DEFAULT_SHOWCASE_STATE.survivorMain,
        perkIds: [...DEFAULT_SHOWCASE_STATE.survivorMain.perkIds],
      },
      killerMain: {
        ...DEFAULT_SHOWCASE_STATE.killerMain,
        perkIds: [...DEFAULT_SHOWCASE_STATE.killerMain.perkIds],
      },
    };
  }

  const p = partial as Partial<UserShowcaseState>;

  const parsePerkIds = (perks: unknown, defaultPerks: (number | null)[]): (number | null)[] => {
    if (!Array.isArray(perks)) return [...defaultPerks];
    const result: (number | null)[] = [null, null, null, null];
    for (let i = 0; i < 4; i++) {
      result[i] = typeof perks[i] === 'number' ? perks[i] : null;
    }
    return result;
  };

  return {
    playerTitle:
      typeof p.playerTitle === 'string' && (PLAYER_TITLES as readonly string[]).includes(p.playerTitle)
        ? p.playerTitle
        : DEFAULT_SHOWCASE_STATE.playerTitle,
    devotionLevel:
      typeof p.devotionLevel === 'number' && Number.isFinite(p.devotionLevel)
        ? Math.max(0, Math.min(99, Math.round(p.devotionLevel)))
        : DEFAULT_SHOWCASE_STATE.devotionLevel,
    gradeRank:
      typeof p.gradeRank === 'string' && (GRADE_EMBLEMS as readonly string[]).includes(p.gradeRank)
        ? p.gradeRank
        : DEFAULT_SHOWCASE_STATE.gradeRank,
    survivorMain: {
      characterName:
        typeof p.survivorMain?.characterName === 'string' &&
        p.survivorMain.characterName.trim() !== ''
          ? p.survivorMain.characterName
          : DEFAULT_SHOWCASE_STATE.survivorMain.characterName,
      ...(typeof p.survivorMain?.characterId === 'number' ? { characterId: p.survivorMain.characterId } : {}),
      prestige:
        typeof p.survivorMain?.prestige === 'number' &&
        Number.isFinite(p.survivorMain.prestige)
          ? Math.max(0, Math.min(100, Math.round(p.survivorMain.prestige)))
          : DEFAULT_SHOWCASE_STATE.survivorMain.prestige,
      perkIds: parsePerkIds(
        p.survivorMain?.perkIds,
        DEFAULT_SHOWCASE_STATE.survivorMain.perkIds
      ),
    },
    killerMain: {
      characterName:
        typeof p.killerMain?.characterName === 'string' &&
        p.killerMain.characterName.trim() !== ''
          ? p.killerMain.characterName
          : DEFAULT_SHOWCASE_STATE.killerMain.characterName,
      ...(typeof p.killerMain?.characterId === 'number' ? { characterId: p.killerMain.characterId } : {}),
      prestige:
        typeof p.killerMain?.prestige === 'number' &&
        Number.isFinite(p.killerMain.prestige)
          ? Math.max(0, Math.min(100, Math.round(p.killerMain.prestige)))
          : DEFAULT_SHOWCASE_STATE.killerMain.prestige,
      perkIds: parsePerkIds(
        p.killerMain?.perkIds,
        DEFAULT_SHOWCASE_STATE.killerMain.perkIds
      ),
    },
  };
}

export function loadStoredShowcase(userId?: number | string | null): UserShowcaseState {
  const storage = getLocalStorage();
  if (!storage) return mergeShowcaseState(null);
  try {
    const raw = storage.getItem(getShowcaseStorageKey(userId));
    if (!raw) return mergeShowcaseState(null);
    return mergeShowcaseState(JSON.parse(raw));
  } catch {
    return mergeShowcaseState(null);
  }
}

export function saveStoredShowcase(
  userId: number | string | null | undefined,
  state: UserShowcaseState
): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(getShowcaseStorageKey(userId), JSON.stringify(state));
  } catch {
    // Ignore storage quota or security errors
  }
}

/** A main with a new character. The old id is dropped: it belongs to the previous pick, not to this name. */
function withCharacter(main: MainLoadout, name: string, characterId?: number): MainLoadout {
  const { characterId: _previous, ...rest } = main;
  return { ...rest, characterName: name, ...(characterId === undefined ? {} : { characterId }) };
}

/** A partial update of a main. A new name without an id drops the old id, which would otherwise outrank it on save. */
function mergeMain(main: MainLoadout, update: Partial<MainLoadout>): MainLoadout {
  const base = update.characterName !== undefined && update.characterId === undefined ? withCharacter(main, update.characterName) : main;
  return { ...base, ...update, perkIds: update.perkIds ? [...update.perkIds] : main.perkIds };
}

export interface UseUserShowcaseReturn {
  showcase: UserShowcaseState;
  state: UserShowcaseState;
  isSaving: boolean;
  isLoading: boolean;
  saveError: string | null;
  setPlayerTitle: (title: string) => void;
  setDevotionLevel: (level: number) => void;
  setGradeRank: (rank: string) => void;
  setSurvivorCharacter: (name: string, characterId?: number) => void;
  setSurvivorPrestige: (prestige: number) => void;
  setSurvivorPerk: (slotIndex: number, perkId: number | null) => void;
  setKillerCharacter: (name: string, characterId?: number) => void;
  setKillerPrestige: (prestige: number) => void;
  setKillerPerk: (slotIndex: number, perkId: number | null) => void;
  setSurvivorMain: (main: Partial<MainLoadout>) => void;
  setKillerMain: (main: Partial<MainLoadout>) => void;
  resetShowcase: () => void;
}

export function useUserShowcase(
  userId?: number | string | null
): UseUserShowcaseReturn {
  const [showcase, setShowcase] = useState<UserShowcaseState>(() =>
    loadStoredShowcase(userId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A signed-in account's showcase is loading until its database copy (or the local fallback) settles.
  const [settledFor, setSettledFor] = useState<number | string | null>(null);
  const isLoading = !!userId && userId !== 'guest' && settledFor !== userId;

  // Another account shows its own stored copy in the same render.
  useOnValueChange(userId, (nextUserId) => setShowcase(loadStoredShowcase(nextUserId)));

  // The edit helpers read the latest showcase from here (they also write it as they go).
  const showcaseRef = useRef<UserShowcaseState>(showcase);
  useLayoutEffect(() => {
    showcaseRef.current = showcase;
  });
  const prevUserIdRef = useRef(userId);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Edits made before the saved showcase has arrived. They are replayed on top of the database copy
   * when it does, instead of the whole (possibly stale, other-device) local copy being saved over it.
   */
  const pendingEditsRef = useRef<((prev: UserShowcaseState) => UserShowcaseState)[]>([]);
  const dbLoadedRef = useRef(false);

  // Sync to database via API when authenticated; a failed save is retried once.
  const syncToDatabase = useCallback(
    (targetUserId: number | string, nextState: UserShowcaseState) => {
      if (typeof window === 'undefined') return;
      const token = getAuthToken();
      if (!token) return; // Unauthenticated or mock; saved to storage

      setIsSaving(true);
      setSaveError(null);

      const attempt = (retriesLeft: number) =>
        updateUserShowcaseApi(targetUserId, nextState)
          .then(() => {
            setIsSaving(false);
          })
          .catch((err) => {
            if (retriesLeft > 0) {
              setTimeout(() => void attempt(retriesLeft - 1), SAVE_RETRY_DELAY_MS);
              return;
            }
            setIsSaving(false);
            setSaveError(err instanceof Error ? err.message : 'Failed to save to database');
          });
      void attempt(1);
    },
    []
  );

  // On mount or userId change: load from storage and fetch from database if authenticated
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      pendingEditsRef.current = [];
    }

    dbLoadedRef.current = false;
    if (!userId || userId === 'guest') return;

    let cancelled = false;
    const controller = new AbortController();

    /** The base is ready (the database copy, or the local one if it could not be read): replay queued edits. */
    const settle = (base: UserShowcaseState) => {
      const edits = pendingEditsRef.current;
      pendingEditsRef.current = [];
      dbLoadedRef.current = true;
      const next = edits.reduce((state, edit) => edit(state), base);
      showcaseRef.current = next;
      saveStoredShowcase(userId, next);
      setShowcase(next);
      reportCompleteShowcaseRoles(userId, next);
      if (edits.length > 0) syncToDatabase(userId, next);
      setSettledFor(userId);
    };

    fetchUserShowcase(userId, controller.signal)
      .then((dbData) => {
        if (!cancelled) settle(dbData ?? showcaseRef.current);
      })
      .catch(() => {
        if (!cancelled) settle(showcaseRef.current);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId, syncToDatabase]);

  // Flush pending debounced database sync on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (userId && userId !== 'guest') {
          syncToDatabase(userId, showcaseRef.current);
        }
      }
    };
  }, [userId, syncToDatabase]);

  const updateState = useCallback(
    (updater: (prev: UserShowcaseState) => UserShowcaseState) => {
      const next = updater(showcaseRef.current);
      showcaseRef.current = next;
      saveStoredShowcase(userId, next);
      setShowcase(next);
      reportCompleteShowcaseRoles(userId, next);

      if (userId && userId !== 'guest' && !dbLoadedRef.current) {
        // Not saved yet: replayed on the database copy once it arrives (see `settle`).
        pendingEditsRef.current.push(updater);
        return;
      }
      if (userId && userId !== 'guest') {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          syncToDatabase(userId, next);
        }, 300);
      }
    },
    [userId, syncToDatabase]
  );

  const setPlayerTitle = useCallback(
    (title: string) => {
      updateState((prev) => ({ ...prev, playerTitle: title }));
    },
    [updateState]
  );

  const setDevotionLevel = useCallback(
    (level: number) => {
      updateState((prev) => ({
        ...prev,
        devotionLevel: Math.max(0, Math.min(99, Math.round(level))),
      }));
    },
    [updateState]
  );

  const setGradeRank = useCallback(
    (rank: string) => {
      updateState((prev) => ({ ...prev, gradeRank: rank }));
    },
    [updateState]
  );

  const setSurvivorCharacter = useCallback(
    (name: string, characterId?: number) => {
      updateState((prev) => ({
        ...prev,
        survivorMain: withCharacter(prev.survivorMain, name, characterId),
      }));
    },
    [updateState]
  );

  const setSurvivorPrestige = useCallback(
    (prestige: number) => {
      updateState((prev) => ({
        ...prev,
        survivorMain: {
          ...prev.survivorMain,
          prestige: Math.max(0, Math.min(100, Math.round(prestige))),
        },
      }));
    },
    [updateState]
  );

  const setSurvivorPerk = useCallback(
    (slotIndex: number, perkId: number | null) => {
      if (slotIndex < 0 || slotIndex >= 4) return;
      updateState((prev) => {
        const newPerks = [...prev.survivorMain.perkIds];
        newPerks[slotIndex] = perkId;
        return {
          ...prev,
          survivorMain: { ...prev.survivorMain, perkIds: newPerks },
        };
      });
    },
    [updateState]
  );

  const setKillerCharacter = useCallback(
    (name: string, characterId?: number) => {
      updateState((prev) => ({
        ...prev,
        killerMain: withCharacter(prev.killerMain, name, characterId),
      }));
    },
    [updateState]
  );

  const setKillerPrestige = useCallback(
    (prestige: number) => {
      updateState((prev) => ({
        ...prev,
        killerMain: {
          ...prev.killerMain,
          prestige: Math.max(0, Math.min(100, Math.round(prestige))),
        },
      }));
    },
    [updateState]
  );

  const setKillerPerk = useCallback(
    (slotIndex: number, perkId: number | null) => {
      if (slotIndex < 0 || slotIndex >= 4) return;
      updateState((prev) => {
        const newPerks = [...prev.killerMain.perkIds];
        newPerks[slotIndex] = perkId;
        return {
          ...prev,
          killerMain: { ...prev.killerMain, perkIds: newPerks },
        };
      });
    },
    [updateState]
  );

  const setSurvivorMain = useCallback(
    (main: Partial<MainLoadout>) => {
      updateState((prev) => ({
        ...prev,
        survivorMain: mergeMain(prev.survivorMain, main),
      }));
    },
    [updateState]
  );

  const setKillerMain = useCallback(
    (main: Partial<MainLoadout>) => {
      updateState((prev) => ({
        ...prev,
        killerMain: mergeMain(prev.killerMain, main),
      }));
    },
    [updateState]
  );

  const resetShowcase = useCallback(() => {
    updateState(() => ({
      ...DEFAULT_SHOWCASE_STATE,
      survivorMain: {
        ...DEFAULT_SHOWCASE_STATE.survivorMain,
        perkIds: [...DEFAULT_SHOWCASE_STATE.survivorMain.perkIds],
      },
      killerMain: {
        ...DEFAULT_SHOWCASE_STATE.killerMain,
        perkIds: [...DEFAULT_SHOWCASE_STATE.killerMain.perkIds],
      },
    }));
  }, [updateState]);

  return {
    showcase,
    state: showcase,
    isSaving,
    isLoading,
    saveError,
    setPlayerTitle,
    setDevotionLevel,
    setGradeRank,
    setSurvivorCharacter,
    setSurvivorPrestige,
    setSurvivorPerk,
    setKillerCharacter,
    setKillerPrestige,
    setKillerPerk,
    setSurvivorMain,
    setKillerMain,
    resetShowcase,
  };
}
