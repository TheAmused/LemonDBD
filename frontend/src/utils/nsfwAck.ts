'use client';
// frontend/src/utils/nsfwAck.ts
//
// Per-roster NSFW content-gate acknowledgment, persisted in localStorage so a
// viewer who has already confirmed "yes, show me this roster's content" for a
// given roster slug isn't re-prompted on every card within that same browser.
//
// Pulled out as pure functions (rather than living inline in SmashOrPassHub.tsx)
// so the gating logic is unit-testable directly: this repo's frontend test
// runner (tsx --test) has no component-rendering harness, so anything that
// needs to be tested as *behavior* rather than source-text regex has to be a
// plain function like this one.
import { useCallback, useSyncExternalStore } from 'react';
import { getLocalStorage } from '@/utils/safeStorage';

export const GLOBAL_NSFW_KEY = 'lemondbd_show_nsfw';
const GLOBAL_NSFW_ONBOARDED_KEY = 'lemondbd_nsfw_onboarded';

/** Has the viewer completed initial onboarding / content preferences modal? */
export function hasSeenNsfwOnboarding(): boolean {
  const storage = getLocalStorage();
  if (!storage) return true;
  try {
    return (
      storage.getItem(GLOBAL_NSFW_ONBOARDED_KEY) === 'true' ||
      storage.getItem('lemondbd_preferences_configured_v2') === 'true' ||
      storage.getItem(GLOBAL_NSFW_KEY) !== null ||
      storage.getItem('lemondbd_preferences_v2') !== null
    );
  } catch {
    return true;
  }
}

/** Record that the viewer has completed initial content preference onboarding. */
export function markNsfwOnboardingComplete(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(GLOBAL_NSFW_ONBOARDED_KEY, 'true');
    storage.setItem('lemondbd_preferences_configured_v2', 'true');
  } catch {
    // Storage unavailable
  }
}

/** Has the viewer enabled global NSFW content display? */
export function getGlobalNsfwPreference(): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(GLOBAL_NSFW_KEY);
    if (raw !== null) {
      return raw === 'true';
    }
    const v2Raw = storage.getItem('lemondbd_preferences_v2');
    if (v2Raw) {
      const v2 = JSON.parse(v2Raw);
      return !!v2?.nsfw;
    }
    return false;
  } catch {
    return false;
  }
}

/** Set the global NSFW preference, persisting to localStorage and notifying listeners. */
export function setGlobalNsfwPreference(enabled: boolean): void {
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(GLOBAL_NSFW_KEY, String(enabled));
      storage.setItem(GLOBAL_NSFW_ONBOARDED_KEY, 'true');
      storage.setItem('lemondbd_nsfw_enabled_v1', String(enabled));
      storage.setItem('lemondbd_preferences_configured_v2', 'true');

      const v2Raw = storage.getItem('lemondbd_preferences_v2');
      const existing = v2Raw ? JSON.parse(v2Raw) : {};
      const updated = {
        effects: typeof existing.effects === 'boolean' ? existing.effects : true,
        sounds: typeof existing.sounds === 'boolean' ? existing.sounds : true,
        music: typeof existing.music === 'boolean' ? existing.music : true,
        nsfw: enabled,
        backgroundAnimation: existing.backgroundAnimation || 'on',
        gifs: typeof existing.gifs === 'boolean' ? existing.gifs : true,
        chosenAt: Date.now(),
      };
      storage.setItem('lemondbd_preferences_v2', JSON.stringify(updated));
    } catch {
      // Storage unavailable (private browsing, quota, etc.)
    }
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const event = typeof CustomEvent !== 'undefined'
        ? new CustomEvent('nsfw-pref-change', { detail: enabled })
        : new Event('nsfw-pref-change');
      window.dispatchEvent(event);
    } catch {
      // Safe fallback if window event dispatch throws
    }
  }
}

function subscribeNsfwPref(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('nsfw-pref-change', onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener('nsfw-pref-change', onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * React hook that subscribes to global NSFW preference changes across components and browser tabs.
 * Safe during SSR (defaults to false).
 */
export function useGlobalNsfwPreference(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(
    subscribeNsfwPref,
    getGlobalNsfwPreference,
    () => false
  );
  const setEnabled = useCallback((next: boolean) => {
    setGlobalNsfwPreference(next);
  }, []);
  return [enabled, setEnabled];
}

// ---------------------------------------------------------------------------
// Tier lists and minigames: the AUTHOR's own flagged items.
//
// For viewers the global switch (above) is the only answer: confirming a gate
// turns it on, turning it off gates everything again. The one thing remembered
// per item is that the author just saved it, so they are not asked about their
// own list or trial.
// ---------------------------------------------------------------------------

/** Kinds of content (besides smash or pass rosters) that can be flagged NSFW. */
export type NsfwContentScope = 'tier_list' | 'minigame';

const CONTENT_STORAGE_PREFIX = 'dbd_nsfw_ack_';

function contentKey(scope: NsfwContentScope, id: string): string {
  return `${CONTENT_STORAGE_PREFIX}${scope}_${id}`;
}

/** Did this browser's user author (save) this flagged tier list or minigame? */
export function hasAcknowledgedNsfwContent(scope: NsfwContentScope, id: string): boolean {
  const storage = getLocalStorage();
  if (!storage || !id) return false;
  try {
    return storage.getItem(contentKey(scope, id)) === 'true';
  } catch {
    return false;
  }
}

/** Record that the author saved it. A storage failure only means they are asked like anyone else. */
export function acknowledgeNsfwContent(scope: NsfwContentScope, id: string): void {
  const storage = getLocalStorage();
  if (!storage || !id) return;
  try {
    storage.setItem(contentKey(scope, id), 'true');
  } catch {
    // Private browsing or a full quota: re-prompting is the safe failure for a content gate.
  }
}
