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
const STORAGE_PREFIX = 'dbd_smash_nsfw_ack_';

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    // Falls back to a bare `localStorage` global (e.g. a test harness that
    // stubs `globalThis.localStorage` without a `window` object at all --
    // this repo's frontend tests run under plain Node via tsx --test, not a
    // browser/jsdom environment, so `window` is undefined there).
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return null;
  } catch {
    return null;
  }
}

/** Has the viewer already clicked through the NSFW confirmation for this roster? */
export function hasAcknowledgedNsfwRoster(rosterSlug: string): boolean {
  const storage = safeLocalStorage();
  if (!storage || !rosterSlug) return false;
  try {
    return storage.getItem(`${STORAGE_PREFIX}${rosterSlug}`) === 'true';
  } catch {
    return false;
  }
}

/** Record that the viewer has confirmed they want to see this roster's content. */
export function acknowledgeNsfwRoster(rosterSlug: string): void {
  const storage = safeLocalStorage();
  if (!storage || !rosterSlug) return;
  try {
    storage.setItem(`${STORAGE_PREFIX}${rosterSlug}`, 'true');
  } catch {
    // Storage unavailable (private browsing, quota, etc.) -- the viewer just
    // gets re-prompted next time, which is a safe (if mildly annoying) failure
    // mode for a content gate, not a broken one.
  }
}
