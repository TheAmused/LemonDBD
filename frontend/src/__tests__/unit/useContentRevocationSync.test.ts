// frontend/src/__tests__/unit/useContentRevocationSync.test.ts
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  checkAndPurgeRevokedContent,
  MIN_SWEEP_GAP_MS,
  requestRevocationSweep,
  useContentRevocationSync,
} from '@/hooks/useContentRevocationSync';
import { storedContentHash } from '@/utils/contentHash';
import { DEFAULT_TIERS } from '@/utils/tierLists/constants';
import { ContentRevocationSync } from '@/components/common/ContentRevocationSync';

class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('useContentRevocationSync', () => {
  let mockStorage: MockLocalStorage;
  let dispatchedEvents: Array<{ type: string; key?: string; detail?: unknown }>;
  const origStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  const origWindow = (globalThis as unknown as { window?: unknown }).window;
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    dispatchedEvents = [];

    const mockWindow = {
      localStorage: mockStorage,
      dispatchEvent: (event: Event | { type: string; key?: string; detail?: unknown }) => {
        const ev = event as { type: string; key?: string; detail?: unknown };
        dispatchedEvents.push({
          type: ev.type,
          key: ev.key,
          detail: ev.detail,
        });
        return true;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
    (globalThis as unknown as { window: unknown }).window = mockWindow;
  });

  afterEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = origStorage;
    (globalThis as unknown as { window?: unknown }).window = origWindow;
    globalThis.fetch = origFetch;
  });

  it('purges revoked tier list from lemondbd_tier_lists and dispatches storage event', async () => {
    const hashRevoked = 'a'.repeat(64);
    const hashKept = 'b'.repeat(64);

    mockStorage.setItem(
      'lemondbd_tier_lists',
      JSON.stringify({
        version: 1,
        rankings: {},
        custom: {
          'list-bad': {
            id: 'list-bad',
            title: 'Revoked List',
            _manifest: { content_type: 'tier_list', content_hash: hashRevoked, author_id: 1 },
          },
          'list-good': {
            id: 'list-good',
            title: 'Kept List',
            _manifest: { content_type: 'tier_list', content_hash: hashKept, author_id: 2 },
          },
        },
      })
    );

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      assert.ok(url.includes('/api/v1/content/revocations/check'));
      const body = JSON.parse(String(init?.body)) as { hashes: string[] };
      assert.ok(body.hashes.includes(hashRevoked));
      assert.ok(body.hashes.includes(hashKept));

      return {
        ok: true,
        status: 200,
        json: async () => ({ revoked_hashes: [hashRevoked] }),
      } as Response;
    };

    const purged = await checkAndPurgeRevokedContent();

    assert.deepEqual(purged, [hashRevoked]);

    const updatedRaw = mockStorage.getItem('lemondbd_tier_lists');
    assert.ok(updatedRaw);
    const updated = JSON.parse(updatedRaw);
    assert.equal(updated.custom['list-bad'], undefined);
    assert.ok(updated.custom['list-good']);

    const storageEvent = dispatchedEvents.find(
      (e) => e.type === 'storage' && e.key === 'lemondbd_tier_lists'
    );
    assert.ok(storageEvent, 'Storage event for lemondbd_tier_lists must be dispatched');

    const contentRevokedEvent = dispatchedEvents.find(
      (e) => e.type === 'content-revoked'
    );
    assert.ok(contentRevokedEvent, 'content-revoked event must be dispatched');
    assert.deepEqual(contentRevokedEvent?.detail, { count: 1, hashes: [hashRevoked], items: 1 });
  });

  it('purges revoked smash roster from lemondbd_smash_rosters and dispatches storage event', async () => {
    const hashRevoked = 'c'.repeat(64);
    const hashKept = 'd'.repeat(64);

    mockStorage.setItem(
      'lemondbd_smash_rosters',
      JSON.stringify({
        version: 1,
        custom: {
          'roster-bad': {
            id: 'roster-bad',
            name: 'Revoked Roster',
            _manifest: { content_type: 'smash_roster', content_hash: hashRevoked },
          },
          'roster-good': {
            id: 'roster-good',
            name: 'Kept Roster',
            _manifest: { content_type: 'smash_roster', content_hash: hashKept },
          },
        },
      })
    );

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ revoked_hashes: [hashRevoked] }),
    } as Response);

    const purged = await checkAndPurgeRevokedContent();

    assert.deepEqual(purged, [hashRevoked]);

    const updatedRaw = mockStorage.getItem('lemondbd_smash_rosters');
    assert.ok(updatedRaw);
    const updated = JSON.parse(updatedRaw);
    assert.equal(updated.custom['roster-bad'], undefined);
    assert.ok(updated.custom['roster-good']);

    const storageEvent = dispatchedEvents.find(
      (e) => e.type === 'storage' && e.key === 'lemondbd_smash_rosters'
    );
    assert.ok(storageEvent, 'Storage event for lemondbd_smash_rosters must be dispatched');
  });

  it('purges revoked challenge from lemondbd_custom_minigames, clears progress, and dispatches storage event', async () => {
    const hashRevoked = 'e'.repeat(64);
    const hashKept = 'f'.repeat(64);

    mockStorage.setItem(
      'lemondbd_custom_minigames',
      JSON.stringify([
        {
          id: 'ch-bad',
          name: 'Revoked Challenge',
          _manifest: { content_type: 'custom_minigame', content_hash: hashRevoked },
        },
        {
          id: 'ch-good',
          name: 'Kept Challenge',
          _manifest: { content_type: 'custom_minigame', content_hash: hashKept },
        },
      ])
    );
    mockStorage.setItem('lemondbd_minigame_progress_ch-bad', JSON.stringify({ completed: true }));
    mockStorage.setItem('lemondbd_minigame_progress_ch-good', JSON.stringify({ completed: true }));

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ revoked_hashes: [hashRevoked] }),
    } as Response);

    const purged = await checkAndPurgeRevokedContent();

    assert.deepEqual(purged, [hashRevoked]);

    const updatedRaw = mockStorage.getItem('lemondbd_custom_minigames');
    assert.ok(updatedRaw);
    const updated = JSON.parse(updatedRaw) as Array<{ id: string }>;
    assert.equal(updated.length, 1);
    assert.equal(updated[0].id, 'ch-good');

    assert.equal(mockStorage.getItem('lemondbd_minigame_progress_ch-bad'), null, 'Orphaned progress must be removed');
    assert.notEqual(mockStorage.getItem('lemondbd_minigame_progress_ch-good'), null, 'Kept progress must remain');

    const storageEvent = dispatchedEvents.find(
      (e) => e.type === 'storage' && e.key === 'lemondbd_custom_minigames'
    );
    assert.ok(storageEvent, 'Storage event for lemondbd_custom_minigames must be dispatched');
  });

  it('purges revoked item from legacy prefix keys and dispatches storage event for each key', async () => {
    const hashRevoked1 = '1'.repeat(64);
    const hashRevoked2 = '2'.repeat(64);
    const hashKept = '3'.repeat(64);

    mockStorage.setItem(
      'tier_lists:custom:legacy1',
      JSON.stringify({ contentHash: hashRevoked1, title: 'Old List' })
    );
    mockStorage.setItem(
      'smash:custom:legacy2',
      JSON.stringify({ _manifest: { content_hash: hashRevoked2 }, title: 'Old Roster' })
    );
    mockStorage.setItem(
      'minigames:custom:legacy3',
      JSON.stringify({ contentHash: hashKept, title: 'Old Minigame' })
    );

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ revoked_hashes: [hashRevoked1, hashRevoked2] }),
    } as Response);

    const purged = await checkAndPurgeRevokedContent();

    assert.equal(purged.length, 2);
    assert.ok(purged.includes(hashRevoked1));
    assert.ok(purged.includes(hashRevoked2));

    assert.equal(mockStorage.getItem('tier_lists:custom:legacy1'), null);
    assert.equal(mockStorage.getItem('smash:custom:legacy2'), null);
    assert.notEqual(mockStorage.getItem('minigames:custom:legacy3'), null);

    const leg1Event = dispatchedEvents.find(
      (e) => e.type === 'storage' && e.key === 'tier_lists:custom:legacy1'
    );
    assert.ok(leg1Event, 'Storage event for legacy1 must be dispatched');

    const leg2Event = dispatchedEvents.find(
      (e) => e.type === 'storage' && e.key === 'smash:custom:legacy2'
    );
    assert.ok(leg2Event, 'Storage event for legacy2 must be dispatched');
  });

  it('is a no-op when no content hashes exist in storage', async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return { ok: true, json: async () => ({ revoked_hashes: [] }) } as Response;
    };

    const purged = await checkAndPurgeRevokedContent();

    assert.deepEqual(purged, []);
    assert.equal(fetchCalled, false, 'fetch should not be called when storage has no hashes');
    assert.equal(dispatchedEvents.length, 0);
  });

  it('is a no-op when server returns empty revoked_hashes', async () => {
    const hashValid = '4'.repeat(64);
    mockStorage.setItem(
      'lemondbd_custom_minigames',
      JSON.stringify([{ id: 'c1', _manifest: { content_hash: hashValid } }])
    );

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ revoked_hashes: [] }),
    } as Response);

    const purged = await checkAndPurgeRevokedContent();

    assert.deepEqual(purged, []);
    assert.notEqual(mockStorage.getItem('lemondbd_custom_minigames'), null);
    assert.equal(dispatchedEvents.length, 0);
  });

  it('resilient against network errors and malformed localStorage entries', async () => {
    mockStorage.setItem('lemondbd_tier_lists', '{malformed json[');
    mockStorage.setItem('lemondbd_smash_rosters', 'not json at all');
    mockStorage.setItem('lemondbd_custom_minigames', 'null');
    mockStorage.setItem('tier_lists:custom:broken', '{bad');

    // Network error
    globalThis.fetch = async () => {
      throw new Error('Network failure');
    };

    const resError = await checkAndPurgeRevokedContent();
    assert.deepEqual(resError, []);

    // Non-200 response
    const validHash = '5'.repeat(64);
    mockStorage.setItem(
      'minigames:custom:valid',
      JSON.stringify({ contentHash: validHash })
    );

    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response);

    const res500 = await checkAndPurgeRevokedContent();
    assert.deepEqual(res500, []);
  });

  it('deduplicates concurrent in-flight calls on mount', async () => {
    const hash = '7'.repeat(64);
    mockStorage.setItem(
      'minigames:custom:flight',
      JSON.stringify({ contentHash: hash })
    );

    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        ok: true,
        status: 200,
        json: async () => ({ revoked_hashes: [hash] }),
      } as Response;
    };

    const [res1, res2] = await Promise.all([
      checkAndPurgeRevokedContent(),
      checkAndPurgeRevokedContent(),
    ]);

    assert.equal(fetchCount, 1, 'Concurrent calls must reuse the in-flight promise');
    assert.deepEqual(res1, [hash]);
    assert.deepEqual(res2, [hash]);
  });

  it('immediately returns empty array during SSR when window is undefined', async () => {
    (globalThis as unknown as { window: unknown }).window = undefined;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return { ok: true, json: async () => ({}) } as Response;
    };

    const result = await checkAndPurgeRevokedContent();
    assert.deepEqual(result, []);
    assert.equal(fetchCalled, false);
  });

  it('purges an unsigned saved copy by the hash of its content', async () => {
    const banned = { id: 'unsigned', title: 'Banned list', tiers: DEFAULT_TIERS, items: [{ id: 'a', name: 'A' }], placements: { s: ['a'] }, createdAt: 1, updatedAt: 2 };
    const kept = { ...banned, id: 'other', title: 'Fine list' };
    const bannedHash = await storedContentHash('tier_list', banned);
    assert.ok(bannedHash);
    mockStorage.setItem('lemondbd_tier_lists', JSON.stringify({ version: 1, rankings: {}, custom: { unsigned: banned, other: kept } }));

    let sent: string[] = [];
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      sent = (JSON.parse(String(init?.body)) as { hashes: string[] }).hashes;
      return { ok: true, status: 200, json: async () => ({ revoked_hashes: [bannedHash] }) } as Response;
    };

    const purged = await checkAndPurgeRevokedContent();

    assert.deepEqual(purged, [bannedHash]);
    assert.equal(sent.length, 2, 'one content hash per saved list');
    const custom = JSON.parse(mockStorage.getItem('lemondbd_tier_lists') ?? '{}').custom;
    assert.deepEqual(Object.keys(custom), ['other']);
    const revoked = dispatchedEvents.find((e) => e.type === 'content-revoked');
    assert.deepEqual(revoked?.detail, { count: 1, hashes: [bannedHash], items: 1 });
  });

  it('purges a copy edited after signing: its stamp is stale but its content is banned', async () => {
    const trial = { id: 'c9', title: 'Edited', description: '', game_mode: 'custom', rounds: [{ mode: 'emoji', target_id: 1 }] };
    const contentHashValue = await storedContentHash('minigame', trial);
    assert.ok(contentHashValue);
    const staleStamp = '9'.repeat(64);
    mockStorage.setItem('lemondbd_custom_minigames', JSON.stringify([{ ...trial, _manifest: { content_hash: staleStamp } }]));

    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      const hashes = (JSON.parse(String(init?.body)) as { hashes: string[] }).hashes;
      assert.ok(hashes.includes(staleStamp) && hashes.includes(contentHashValue));
      return { ok: true, status: 200, json: async () => ({ revoked_hashes: [contentHashValue] }) } as Response;
    };

    assert.deepEqual(await checkAndPurgeRevokedContent(), [contentHashValue]);
    assert.deepEqual(JSON.parse(mockStorage.getItem('lemondbd_custom_minigames') ?? 'null'), []);
  });

  it('keeps an item that was edited while the check was in flight', async () => {
    const roster = { id: 'r1', name: 'Roster', _manifest: { content_hash: 'c'.repeat(64) } };
    mockStorage.setItem('lemondbd_smash_rosters', JSON.stringify({ version: 1, custom: { r1: roster } }));

    globalThis.fetch = async () => {
      mockStorage.setItem('lemondbd_smash_rosters', JSON.stringify({ version: 1, custom: { r1: { id: 'r1', name: 'Reworked' } } }));
      return { ok: true, status: 200, json: async () => ({ revoked_hashes: ['c'.repeat(64)] }) } as Response;
    };

    assert.deepEqual(await checkAndPurgeRevokedContent(), []);
    assert.equal(JSON.parse(mockStorage.getItem('lemondbd_smash_rosters') ?? '{}').custom.r1.name, 'Reworked');
  });

  it('splits more than 200 hashes into several requests', async () => {
    const trials = Array.from({ length: 150 }, (_, i) => ({ id: `t${i}`, title: `Trial ${i}`, rounds: [], _manifest: { content_hash: i.toString(16).padStart(64, '0') } }));
    mockStorage.setItem('lemondbd_custom_minigames', JSON.stringify(trials));
    const batches: number[] = [];
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      batches.push((JSON.parse(String(init?.body)) as { hashes: string[] }).hashes.length);
      return { ok: true, status: 200, json: async () => ({ revoked_hashes: [] }) } as Response;
    };

    await checkAndPurgeRevokedContent();

    assert.deepEqual(batches, [200, 100], '150 stamps plus 150 content hashes');
  });

  it('throttles the automatic sweeps', async () => {
    mockStorage.setItem('minigames:custom:throttle', JSON.stringify({ contentHash: '8'.repeat(64) }));
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ revoked_hashes: [] }) } as Response;
    };
    const start = 1_000_000_000_000;

    await requestRevocationSweep(start);
    await requestRevocationSweep(start + 1000);
    await requestRevocationSweep(start + MIN_SWEEP_GAP_MS);

    assert.equal(calls, 2, 'a sweep inside the gap is skipped');
  });

  it('ContentRevocationSync component renders null and hook is callable', () => {
    const html = renderToStaticMarkup(React.createElement(ContentRevocationSync));
    assert.equal(html, '');
    assert.equal(typeof useContentRevocationSync, 'function');
  });
});
