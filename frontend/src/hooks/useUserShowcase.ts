// frontend/src/hooks/useUserShowcase.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DEFAULT_SHOWCASE_STATE,
  type UserShowcaseState,
  type MainLoadout,
} from '@/types/userShowcase';
import {
  fetchUserShowcase,
  updateUserShowcaseApi,
} from '@/services/userShowcaseApi';

export function getShowcaseStorageKey(userId?: number | string | null): string {
  return `lemondbd_showcase_${userId ?? 'guest'}`;
}

export function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
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
      typeof p.playerTitle === 'string' && p.playerTitle.trim() !== ''
        ? p.playerTitle
        : DEFAULT_SHOWCASE_STATE.playerTitle,
    devotionLevel:
      typeof p.devotionLevel === 'number' && Number.isFinite(p.devotionLevel)
        ? Math.max(1, Math.min(99, Math.round(p.devotionLevel)))
        : DEFAULT_SHOWCASE_STATE.devotionLevel,
    gradeRank:
      typeof p.gradeRank === 'string' && p.gradeRank.trim() !== ''
        ? p.gradeRank
        : DEFAULT_SHOWCASE_STATE.gradeRank,
    survivorMain: {
      characterName:
        typeof p.survivorMain?.characterName === 'string' &&
        p.survivorMain.characterName.trim() !== ''
          ? p.survivorMain.characterName
          : DEFAULT_SHOWCASE_STATE.survivorMain.characterName,
      prestige:
        typeof p.survivorMain?.prestige === 'number' &&
        Number.isFinite(p.survivorMain.prestige)
          ? Math.max(1, Math.min(100, Math.round(p.survivorMain.prestige)))
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
      prestige:
        typeof p.killerMain?.prestige === 'number' &&
        Number.isFinite(p.killerMain.prestige)
          ? Math.max(1, Math.min(100, Math.round(p.killerMain.prestige)))
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

export interface UseUserShowcaseReturn {
  showcase: UserShowcaseState;
  state: UserShowcaseState;
  isSaving: boolean;
  isLoading: boolean;
  saveError: string | null;
  setPlayerTitle: (title: string) => void;
  setDevotionLevel: (level: number) => void;
  setGradeRank: (rank: string) => void;
  setSurvivorCharacter: (name: string) => void;
  setSurvivorPrestige: (prestige: number) => void;
  setSurvivorPerk: (slotIndex: number, perkId: number | null) => void;
  setKillerCharacter: (name: string) => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const showcaseRef = useRef<UserShowcaseState>(showcase);
  showcaseRef.current = showcase;
  const prevUserIdRef = useRef(userId);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserModifiedRef = useRef(false);

  // Sync to database via API when authenticated
  const syncToDatabase = useCallback(
    (targetUserId: number | string, nextState: UserShowcaseState) => {
      if (typeof window === 'undefined') return;
      const storage = getLocalStorage();
      const token = storage?.getItem('lemondbd_token');
      if (!token) return; // Unauthenticated or mock; saved to storage

      setIsSaving(true);
      setSaveError(null);

      updateUserShowcaseApi(targetUserId, nextState)
        .then(() => {
          setIsSaving(false);
        })
        .catch((err) => {
          setIsSaving(false);
          setSaveError(err instanceof Error ? err.message : 'Failed to save to database');
        });
    },
    []
  );

  // On mount or userId change: load from storage and fetch from database if authenticated
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      hasUserModifiedRef.current = false;
      const loaded = loadStoredShowcase(userId);
      showcaseRef.current = loaded;
      setShowcase(loaded);
    }

    if (!userId || userId === 'guest') return;

    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);

    fetchUserShowcase(userId, controller.signal)
      .then((dbData) => {
        if (!cancelled && dbData) {
          // Do not overwrite if the user already made edits before the network response returned
          if (!hasUserModifiedRef.current) {
            showcaseRef.current = dbData;
            saveStoredShowcase(userId, dbData);
            setShowcase(dbData);
          }
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId]);

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
      hasUserModifiedRef.current = true;
      const next = updater(showcaseRef.current);
      showcaseRef.current = next;
      saveStoredShowcase(userId, next);
      setShowcase(next);

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
        devotionLevel: Math.max(1, Math.min(99, Math.round(level))),
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
    (name: string) => {
      updateState((prev) => ({
        ...prev,
        survivorMain: { ...prev.survivorMain, characterName: name },
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
          prestige: Math.max(1, Math.min(100, Math.round(prestige))),
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
    (name: string) => {
      updateState((prev) => ({
        ...prev,
        killerMain: { ...prev.killerMain, characterName: name },
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
          prestige: Math.max(1, Math.min(100, Math.round(prestige))),
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
        survivorMain: {
          ...prev.survivorMain,
          ...main,
          perkIds: main.perkIds ? [...main.perkIds] : prev.survivorMain.perkIds,
        },
      }));
    },
    [updateState]
  );

  const setKillerMain = useCallback(
    (main: Partial<MainLoadout>) => {
      updateState((prev) => ({
        ...prev,
        killerMain: {
          ...prev.killerMain,
          ...main,
          perkIds: main.perkIds ? [...main.perkIds] : prev.killerMain.perkIds,
        },
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
