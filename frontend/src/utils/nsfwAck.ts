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
import { getLocalStorage } from '@/utils/safeStorage';
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
