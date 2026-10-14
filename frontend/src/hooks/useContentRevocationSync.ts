'use client';
// frontend/src/hooks/useContentRevocationSync.ts
/**
 * Hook and service to synchronize revoked content hashes with localStorage.
 * Periodically or on app mount, scans user-saved tier lists, smash rosters,
 * and custom minigames, sends hashes to /api/v1/content/revocations/check,
 * and deletes any entries that have been revoked by moderation.
 */
import { useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import { getLocalStorage } from '@/utils/safeStorage';

const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;

function isHex64(val: unknown): val is string {
  return typeof val === 'string' && HEX_64_REGEX.test(val);
}

function dispatchStorageEvent(key: string): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    if (typeof StorageEvent !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key }));
    } else {
      const event = new Event('storage');
      Object.defineProperty(event, 'key', { value: key });
      window.dispatchEvent(event);
    }
  } catch {
    try {
      window.dispatchEvent({ type: 'storage', key } as unknown as Event);
    } catch {
      // Graceful fallback for non-browser runtimes
    }
  }
}

function dispatchContentRevoked(purged: string[]): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    if (typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('content-revoked', {
          detail: { count: purged.length, hashes: purged },
        })
      );
    } else {
      const event = new Event('content-revoked');
      Object.defineProperty(event, 'detail', {
        value: { count: purged.length, hashes: purged },
      });
      window.dispatchEvent(event);
    }
  } catch {
    try {
      window.dispatchEvent({
        type: 'content-revoked',
        detail: { count: purged.length, hashes: purged },
      } as unknown as Event);
    } catch {
      // Graceful fallback for non-browser runtimes
    }
  }
}

let syncPromise: Promise<string[]> | null = null;

async function doCheckAndPurge(): Promise<string[]> {
  try {
    const storage = getLocalStorage();
    if (!storage) return [];

    const hashesToScan = new Set<string>();
    const legacyKeys: string[] = [];

    // 1. lemondbd_tier_lists
    try {
      const tierRaw = storage.getItem('lemondbd_tier_lists');
      if (tierRaw) {
        const parsed = JSON.parse(tierRaw);
        if (parsed && typeof parsed.custom === 'object' && parsed.custom !== null) {
          for (const item of Object.values(parsed.custom)) {
            const hash = (item as { _manifest?: { content_hash?: unknown } })?._manifest?.content_hash;
            if (isHex64(hash)) hashesToScan.add(hash);
          }
        }
      }
    } catch {
      // Malformed entries ignored defensively
    }

    // 2. lemondbd_smash_rosters
    try {
      const smashRaw = storage.getItem('lemondbd_smash_rosters');
      if (smashRaw) {
        const parsed = JSON.parse(smashRaw);
        if (parsed && typeof parsed.custom === 'object' && parsed.custom !== null) {
          for (const item of Object.values(parsed.custom)) {
            const hash = (item as { _manifest?: { content_hash?: unknown } })?._manifest?.content_hash;
            if (isHex64(hash)) hashesToScan.add(hash);
          }
        }
      }
    } catch {
      // Malformed entries ignored defensively
    }

    // 3. lemondbd_custom_minigames
    try {
      const minigamesRaw = storage.getItem('lemondbd_custom_minigames');
      if (minigamesRaw) {
        const parsed = JSON.parse(minigamesRaw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const hash = (item as { _manifest?: { content_hash?: unknown } })?._manifest?.content_hash;
            if (isHex64(hash)) hashesToScan.add(hash);
          }
        }
      }
    } catch {
      // Malformed entries ignored defensively
    }

    // 4. Generic/legacy keys
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        if (
          key.startsWith('tier_lists:custom:') ||
          key.startsWith('smash:custom:') ||
          key.startsWith('minigames:custom:')
        ) {
          legacyKeys.push(key);
          try {
            const raw = storage.getItem(key);
            if (raw) {
              const item = JSON.parse(raw) as {
                contentHash?: unknown;
                _manifest?: { content_hash?: unknown };
              };
              const hash = item?.contentHash || item?._manifest?.content_hash;
              if (isHex64(hash)) hashesToScan.add(hash);
            }
          } catch {
            // Malformed entries ignored defensively
          }
        }
      }
    } catch {
      // Storage access error ignored defensively
    }

    if (hashesToScan.size === 0) return [];

    const res = await fetch(apiUrl('/api/v1/content/revocations/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes: Array.from(hashesToScan) }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { revoked_hashes?: string[] };
    const serverRevoked = Array.isArray(data?.revoked_hashes) ? data.revoked_hashes : [];
    if (serverRevoked.length === 0) return [];

    const revokedSet = new Set(serverRevoked);
    const purgedSet = new Set<string>();

    // Purge from lemondbd_tier_lists
    try {
      const tierRaw = storage.getItem('lemondbd_tier_lists');
      if (tierRaw) {
        const parsed = JSON.parse(tierRaw);
        if (parsed && typeof parsed.custom === 'object' && parsed.custom !== null) {
          let modified = false;
          const purgedInTier: string[] = [];
          for (const [id, item] of Object.entries(parsed.custom)) {
            const hash = (item as { _manifest?: { content_hash?: unknown } })?._manifest?.content_hash;
            if (typeof hash === 'string' && revokedSet.has(hash)) {
              delete (parsed.custom as Record<string, unknown>)[id];
              purgedInTier.push(hash);
              modified = true;
            }
          }
          if (modified) {
            storage.setItem('lemondbd_tier_lists', JSON.stringify(parsed));
            dispatchStorageEvent('lemondbd_tier_lists');
            for (const h of purgedInTier) purgedSet.add(h);
          }
        }
      }
    } catch {
      // Storage write error ignored defensively
    }

    // Purge from lemondbd_smash_rosters
    try {
      const smashRaw = storage.getItem('lemondbd_smash_rosters');
      if (smashRaw) {
        const parsed = JSON.parse(smashRaw);
        if (parsed && typeof parsed.custom === 'object' && parsed.custom !== null) {
          let modified = false;
          const purgedInSmash: string[] = [];
          for (const [id, item] of Object.entries(parsed.custom)) {
            const hash = (item as { _manifest?: { content_hash?: unknown } })?._manifest?.content_hash;
            if (typeof hash === 'string' && revokedSet.has(hash)) {
              delete (parsed.custom as Record<string, unknown>)[id];
              purgedInSmash.push(hash);
              modified = true;
            }
          }
          if (modified) {
            storage.setItem('lemondbd_smash_rosters', JSON.stringify(parsed));
            dispatchStorageEvent('lemondbd_smash_rosters');
            for (const h of purgedInSmash) purgedSet.add(h);
          }
        }
      }
    } catch {
      // Storage write error ignored defensively
    }

    // Purge from lemondbd_custom_minigames
    try {
      const minigamesRaw = storage.getItem('lemondbd_custom_minigames');
      if (minigamesRaw) {
        const parsed = JSON.parse(minigamesRaw);
        if (Array.isArray(parsed)) {
          let modified = false;
          const purgedInMinigames: string[] = [];
          const removedChallengeIds: Array<string | number> = [];
          const remaining = parsed.filter((item) => {
            const hash = (item as { _manifest?: { content_hash?: unknown } })?._manifest?.content_hash;
            if (typeof hash === 'string' && revokedSet.has(hash)) {
              purgedInMinigames.push(hash);
              const chId = (item as { id?: string | number })?.id;
              if (chId !== undefined && chId !== null) removedChallengeIds.push(chId);
              modified = true;
              return false;
            }
            return true;
          });
          if (modified) {
            storage.setItem('lemondbd_custom_minigames', JSON.stringify(remaining));
            dispatchStorageEvent('lemondbd_custom_minigames');
            for (const id of removedChallengeIds) {
              try {
                storage.removeItem('lemondbd_minigame_progress_' + id);
              } catch {
                // ignore
              }
            }
            for (const h of purgedInMinigames) purgedSet.add(h);
          }
        }
      }
    } catch {
      // Storage write error ignored defensively
    }

    // Purge from generic/legacy keys
    for (const key of legacyKeys) {
      try {
        const raw = storage.getItem(key);
        if (raw) {
          const item = JSON.parse(raw) as {
            contentHash?: unknown;
            _manifest?: { content_hash?: unknown };
          };
          const hash = item?.contentHash || item?._manifest?.content_hash;
          if (typeof hash === 'string' && revokedSet.has(hash)) {
            storage.removeItem(key);
            dispatchStorageEvent(key);
            purgedSet.add(hash);
          }
        }
      } catch {
        // Storage remove error ignored defensively
      }
    }

    const purged = Array.from(purgedSet);

    if (purged.length > 0) {
      dispatchContentRevoked(purged);
    }

    return purged;
  } catch {
    return [];
  }
}

/**
 * Scans localStorage across tier lists, smash rosters, minigames, and legacy keys,
 * queries the revocation endpoint, removes revoked items from storage, and dispatches events.
 * Deduplicates concurrent in-flight calls on mount.
 */
export async function checkAndPurgeRevokedContent(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      return await doCheckAndPurge();
    } finally {
      syncPromise = null;
    }
  })();
  return syncPromise;
}

/**
 * React hook that triggers checkAndPurgeRevokedContent once on mount.
 */
export function useContentRevocationSync(): void {
  useEffect(() => {
    void checkAndPurgeRevokedContent();
  }, []);
}
