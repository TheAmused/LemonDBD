'use client';
// frontend/src/context/PreferencesContext.tsx

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useOptionalAuth } from '@/context/AuthContext';
import {
  fetchUserPreferences,
  saveUserPreferences,
  type RemoteUserPreferences,
} from '@/services/userPreferencesApi';
import { useOnceInBrowser } from '@/hooks/useOnceInBrowser';

export type BackgroundAnimationMode = 'on' | 'eco' | 'off';

export interface SitePreferences {
  effects: boolean;
  sounds: boolean;
  music: boolean;
  nsfw: boolean;
  backgroundAnimation: BackgroundAnimationMode;
  chosenAt: number;
}

export interface PreferencesContextType {
  preferences: SitePreferences;
  updatePreferences: (change: Partial<SitePreferences>) => Promise<void>;
  isConfigured: boolean;
  markConfigured: () => void;
  isSyncing: boolean;
}

export const PREFERENCES_STORAGE_KEY = 'lemondbd_preferences_v2';
export const PREFERENCES_CONFIGURED_KEY = 'lemondbd_preferences_configured_v2';

/** Check whether system prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Computes default site preferences */
export function defaultPreferences(reducedMotion?: boolean): SitePreferences {
  const isReduced = typeof reducedMotion === 'boolean' ? reducedMotion : prefersReducedMotion();
  return {
    effects: !isReduced,
    sounds: true,
    music: !isReduced,
    nsfw: false,
    backgroundAnimation: isReduced ? 'eco' : 'on',
    chosenAt: 0,
  };
}

export function toRemote(prefs: SitePreferences): RemoteUserPreferences {
  return {
    effects: prefs.effects,
    sounds: prefs.sounds,
    music: prefs.music,
    nsfw: prefs.nsfw,
    background_animation: prefs.backgroundAnimation,
    chosen_at: prefs.chosenAt,
  };
}

export function fromRemote(remote: RemoteUserPreferences): SitePreferences {
  const bg = remote.background_animation;
  const backgroundAnimation: BackgroundAnimationMode =
    bg === 'on' || bg === 'eco' || bg === 'off' ? bg : 'on';
  return {
    effects: !!remote.effects,
    sounds: !!remote.sounds,
    music: !!remote.music,
    nsfw: !!remote.nsfw,
    backgroundAnimation,
    chosenAt: Number(remote.chosen_at) || 0,
  };
}

/**
 * Reconciles local and remote database preferences.
 * When remote exists, it takes precedence (pushToAccount: false).
 * When remote is null, local preferences are preserved and pushed to the database (pushToAccount: true).
 */
export function reconcileWithDatabase(
  local: SitePreferences | null,
  remote: SitePreferences | RemoteUserPreferences | null
): { preferences: SitePreferences; pushToAccount: boolean } {
  if (remote !== null) {
    const preferences: SitePreferences =
      'background_animation' in remote || 'chosen_at' in remote
        ? fromRemote(remote as RemoteUserPreferences)
        : (remote as SitePreferences);
    return { preferences, pushToAccount: false };
  }
  if (local !== null) {
    return { preferences: local, pushToAccount: true };
  }
  return { preferences: defaultPreferences(), pushToAccount: false };
}

export function parseSitePreferences(value: unknown): SitePreferences | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.effects !== 'boolean' ||
    typeof v.sounds !== 'boolean' ||
    typeof v.music !== 'boolean' ||
    typeof v.nsfw !== 'boolean' ||
    typeof v.chosenAt !== 'number'
  ) {
    return null;
  }
  const bg = v.backgroundAnimation;
  const backgroundAnimation: BackgroundAnimationMode =
    bg === 'on' || bg === 'eco' || bg === 'off' ? bg : 'on';
  return {
    effects: v.effects,
    sounds: v.sounds,
    music: v.music,
    nsfw: v.nsfw,
    backgroundAnimation,
    chosenAt: v.chosenAt,
  };
}

export function readLocalPreferences(): SitePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sitePrefs = parseSitePreferences(parsed);
      if (sitePrefs) return sitePrefs;
    }

    // Migration fallback from legacy keys
    const rawSmash = localStorage.getItem('lemondbd_smash_prefs_v1');
    const rawNsfw = localStorage.getItem('lemondbd_show_nsfw');
    if (rawSmash) {
      const parsedSmash = JSON.parse(rawSmash);
      if (parsedSmash && typeof parsedSmash === 'object') {
        const p = parsedSmash as Record<string, unknown>;
        return {
          effects: typeof p.effects === 'boolean' ? p.effects : true,
          sounds: typeof p.sounds === 'boolean' ? p.sounds : true,
          music: typeof p.music === 'boolean' ? p.music : true,
          nsfw: rawNsfw === 'true',
          backgroundAnimation: 'on',
          chosenAt: typeof p.chosenAt === 'number' ? p.chosenAt : 0,
        };
      }
    } else if (rawNsfw !== null) {
      return {
        ...defaultPreferences(),
        nsfw: rawNsfw === 'true',
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeLocalPreferences(prefs: SitePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    localStorage.setItem(PREFERENCES_CONFIGURED_KEY, 'true');

    // Dual-write legacy keys so existing components & tests remain compatible
    localStorage.setItem(
      'lemondbd_smash_prefs_v1',
      JSON.stringify({
        effects: prefs.effects,
        sounds: prefs.sounds,
        music: prefs.music,
        chosenAt: prefs.chosenAt,
      })
    );
    localStorage.setItem('lemondbd_show_nsfw', String(prefs.nsfw));
    localStorage.setItem('lemondbd_nsfw_enabled_v1', String(prefs.nsfw));
    localStorage.setItem('lemondbd_nsfw_onboarded', 'true');
  } catch {
    // Storage unavailable
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        typeof CustomEvent !== 'undefined'
          ? new CustomEvent('preferences-changed', { detail: prefs })
          : new Event('preferences-changed')
      );
      window.dispatchEvent(
        typeof CustomEvent !== 'undefined'
          ? new CustomEvent('nsfw-pref-change', { detail: prefs.nsfw })
          : new Event('nsfw-pref-change')
      );
    } catch {}
  }
}

export function readIsConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(PREFERENCES_CONFIGURED_KEY) === 'true') return true;
    if (localStorage.getItem(PREFERENCES_STORAGE_KEY) !== null) return true;
    if (localStorage.getItem('lemondbd_smash_prefs_v1') !== null) return true;
    if (localStorage.getItem('lemondbd_nsfw_onboarded') === 'true') return true;
  } catch {
    return false;
  }
  return false;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useOptionalAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const userId = auth?.user?.id ?? null;
  const token = auth?.token ?? null;

  const [preferences, setPreferences] = useState<SitePreferences>(defaultPreferences);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const syncedUserIdRef = useRef<number | null>(null);
  const preferencesRef = useRef<SitePreferences>(preferences);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Initialize from localStorage once running in the browser
  useOnceInBrowser(() => {
    const local = readLocalPreferences();
    if (local) {
      preferencesRef.current = local;
      setPreferences(local);
    }
    setIsConfigured(readIsConfigured());
  });

  // Single-fetch synchronization when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || userId === null) {
      syncedUserIdRef.current = null;
      return;
    }

    if (syncedUserIdRef.current === userId) return;
    syncedUserIdRef.current = userId;

    let cancelled = false;
    void (async () => {
      setIsSyncing(true);
      try {
        const remote = await fetchUserPreferences(token);
        if (cancelled) return;

        const currentLocal = readLocalPreferences() ?? preferencesRef.current;
        const { preferences: reconciled, pushToAccount } = reconcileWithDatabase(
          currentLocal,
          remote
        );

        preferencesRef.current = reconciled;
        setPreferences(reconciled);
        writeLocalPreferences(reconciled);
        setIsConfigured(true);

        if (pushToAccount) {
          await saveUserPreferences(toRemote(reconciled), token);
        }
      } catch {
        // Sync failure gracefully caught
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, token]);

  const updatePreferences = useCallback(
    async (change: Partial<SitePreferences>) => {
      const next: SitePreferences = {
        ...preferencesRef.current,
        ...change,
        chosenAt: Date.now(),
      };
      preferencesRef.current = next;
      setPreferences(next);
      setIsConfigured(true);
      writeLocalPreferences(next);

      if (isAuthenticated && userId !== null) {
        await saveUserPreferences(toRemote(next), token);
      }
    },
    [isAuthenticated, userId, token]
  );

  const updatePreferencesRef = useRef(updatePreferences);
  useEffect(() => {
    updatePreferencesRef.current = updatePreferences;
  });

  // Listen to external/tab updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePreferencesChange = (e: Event) => {
      const custom = e as CustomEvent<SitePreferences>;
      if (custom.detail) {
        preferencesRef.current = custom.detail;
        setPreferences(custom.detail);
        setIsConfigured(true);
      } else {
        const local = readLocalPreferences();
        if (local) {
          preferencesRef.current = local;
          setPreferences(local);
        }
      }
    };

    const handleNsfwChange = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      if (typeof custom.detail === 'boolean') {
        void updatePreferencesRef.current({ nsfw: custom.detail });
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === PREFERENCES_STORAGE_KEY ||
        e.key === 'lemondbd_smash_prefs_v1' ||
        e.key === 'lemondbd_show_nsfw'
      ) {
        const local = readLocalPreferences();
        if (local) {
          preferencesRef.current = local;
          setPreferences(local);
        }
        setIsConfigured(readIsConfigured());
      }
    };

    window.addEventListener('preferences-changed', handlePreferencesChange);
    window.addEventListener('nsfw-pref-change', handleNsfwChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('preferences-changed', handlePreferencesChange);
      window.removeEventListener('nsfw-pref-change', handleNsfwChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const markConfigured = useCallback(() => {
    setIsConfigured(true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFERENCES_CONFIGURED_KEY, 'true');
        localStorage.setItem('lemondbd_nsfw_onboarded', 'true');
      } catch {}
    }
  }, []);

  const contextValue = React.useMemo<PreferencesContextType>(
    () => ({
      preferences,
      updatePreferences,
      isConfigured,
      markConfigured,
      isSyncing,
    }),
    [preferences, updatePreferences, isConfigured, markConfigured, isSyncing]
  );

  return <PreferencesContext.Provider value={contextValue}>{children}</PreferencesContext.Provider>;
};

export function usePreferences(): PreferencesContextType {
  const context = useContext(PreferencesContext);
  if (!context) {
    return {
      preferences: defaultPreferences(),
      updatePreferences: async () => {},
      isConfigured: false,
      markConfigured: () => {},
      isSyncing: false,
    };
  }
  return context;
}
