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

/** Has the viewer enabled global NSFW content display? */
export function getGlobalNsfwPreference(): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    return storage.getItem(GLOBAL_NSFW_KEY) === 'true';
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

const STORAGE_PREFIX = 'dbd_smash_nsfw_ack_';

/** Has the viewer already clicked through the NSFW confirmation for this roster? */
export function hasAcknowledgedNsfwRoster(rosterSlug: string): boolean {
  const storage = getLocalStorage();
  if (!storage || !rosterSlug) return false;
  try {
    return storage.getItem(`${STORAGE_PREFIX}${rosterSlug}`) === 'true';
  } catch {
    return false;
  }
}

/** Record that the viewer has confirmed they want to see this roster's content. */
export function acknowledgeNsfwRoster(rosterSlug: string): void {
  const storage = getLocalStorage();
  if (!storage || !rosterSlug) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${rosterSlug}`, 'true');
  } catch {
    // Storage unavailable (private browsing, quota, etc.) -- the viewer just
    // gets re-prompted next time, which is a safe (if mildly annoying) failure
    // mode for a content gate, not a broken one.
  }
}

// ---------------------------------------------------------------------------
// Tier lists and minigames: the same confirmation, keyed by what is being opened.
// ---------------------------------------------------------------------------

/** Kinds of content (besides smash or pass rosters) that can be flagged NSFW. */
export type NsfwContentScope = 'tier_list' | 'minigame';

const CONTENT_STORAGE_PREFIX = 'dbd_nsfw_ack_';

function contentKey(scope: NsfwContentScope, id: string): string {
  return `${CONTENT_STORAGE_PREFIX}${scope}_${id}`;
}

/** Has the viewer already confirmed they want to open this tier list or minigame? */
export function hasAcknowledgedNsfwContent(scope: NsfwContentScope, id: string): boolean {
  const storage = getLocalStorage();
  if (!storage || !id) return false;
  try {
    return storage.getItem(contentKey(scope, id)) === 'true';
  } catch {
    return false;
  }
}

/** Record the confirmation. A storage failure only means the viewer is asked again next time. */
export function acknowledgeNsfwContent(scope: NsfwContentScope, id: string): void {
  const storage = getLocalStorage();
  if (!storage || !id) return;
  try {
    storage.setItem(contentKey(scope, id), 'true');
  } catch {
    // Private browsing or a full quota: re-prompting is the safe failure for a content gate.
  }
}
