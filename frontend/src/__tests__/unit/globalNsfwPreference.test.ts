// frontend/src/__tests__/unit/globalNsfwPreference.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_NSFW_KEY,
  getGlobalNsfwPreference,
  setGlobalNsfwPreference,
  useGlobalNsfwPreference,
} from '@/utils/nsfwAck';
import { deleteOfficialTierList } from '@/services/tierListApi';
import { deleteOfficialRoster } from '@/services/smashApi';
import { deleteOfficialChallenge } from '@/services/minigameApi';

function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('global NSFW preference state', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = createMockLocalStorage();
  });

  it('GLOBAL_NSFW_KEY is lemondbd_show_nsfw', () => {
    assert.equal(GLOBAL_NSFW_KEY, 'lemondbd_show_nsfw');
  });

  it('getGlobalNsfwPreference() defaults to false when unset in localStorage', () => {
    assert.equal(getGlobalNsfwPreference(), false);
  });

  it("setGlobalNsfwPreference(true) persists 'true' in localStorage (lemondbd_show_nsfw) and returns true", () => {
    setGlobalNsfwPreference(true);
    const storage = (globalThis as unknown as { localStorage: Storage }).localStorage;
    assert.equal(storage.getItem('lemondbd_show_nsfw'), 'true');
    assert.equal(getGlobalNsfwPreference(), true);
  });

  it("setGlobalNsfwPreference(false) persists 'false' in localStorage and returns false", () => {
    setGlobalNsfwPreference(true);
    assert.equal(getGlobalNsfwPreference(), true);
    setGlobalNsfwPreference(false);
    const storage = (globalThis as unknown as { localStorage: Storage }).localStorage;
    assert.equal(storage.getItem('lemondbd_show_nsfw'), 'false');
    assert.equal(getGlobalNsfwPreference(), false);
  });

  it('dispatches nsfw-pref-change CustomEvent on window when preference changes', () => {
    let dispatchedEvent: Event | null = null;
    const originalWindow = (globalThis as unknown as { window?: unknown }).window;
    const mockWindow = {
      dispatchEvent: (event: Event) => {
        dispatchedEvent = event;
        return true;
      },
    };
    (globalThis as unknown as { window: unknown }).window = mockWindow;

    try {
      setGlobalNsfwPreference(true);
      assert.ok(dispatchedEvent !== null);
      assert.equal((dispatchedEvent as CustomEvent).type, 'nsfw-pref-change');
      assert.equal((dispatchedEvent as CustomEvent).detail, true);
    } finally {
      (globalThis as unknown as { window?: unknown }).window = originalWindow;
    }
  });

  it('safe when localStorage is unavailable or throws', () => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: () => {
        throw new Error('access denied');
      },
      setItem: () => {
        throw new Error('access denied');
      },
    };
    assert.equal(getGlobalNsfwPreference(), false);
    assert.doesNotThrow(() => setGlobalNsfwPreference(true));
  });

  it('useGlobalNsfwPreference hook is exported as a function', () => {
    assert.equal(typeof useGlobalNsfwPreference, 'function');
  });
});

describe('admin deletion API methods', () => {
  const originalFetch = globalThis.fetch;

  it('deleteOfficialTierList is exported and calls DELETE endpoint', async () => {
    assert.equal(typeof deleteOfficialTierList, 'function');
    let calledUrl = '';
    let calledMethod = '';
    let calledHeaders: HeadersInit | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calledUrl = String(input);
      calledMethod = init?.method || '';
      calledHeaders = init?.headers;
      return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
    }) as typeof fetch;

    try {
      await deleteOfficialTierList('killer-tier-list', 'test-token');
      assert.equal(calledMethod, 'DELETE');
      assert.ok(calledUrl.includes('/api/v1/tier-lists/killer-tier-list'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('deleteOfficialRoster is exported and calls DELETE endpoint', async () => {
    assert.equal(typeof deleteOfficialRoster, 'function');
    let calledUrl = '';
    let calledMethod = '';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calledUrl = String(input);
      calledMethod = init?.method || '';
      return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
    }) as typeof fetch;

    try {
      await deleteOfficialRoster('default-roster', 'test-token');
      assert.equal(calledMethod, 'DELETE');
      assert.ok(calledUrl.includes('/api/v1/smash-or-pass/admin/rosters/default-roster'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('deleteOfficialChallenge is exported and calls DELETE endpoint', async () => {
    assert.equal(typeof deleteOfficialChallenge, 'function');
    let calledUrl = '';
    let calledMethod = '';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calledUrl = String(input);
      calledMethod = init?.method || '';
      return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
    }) as typeof fetch;

    try {
      await deleteOfficialChallenge(42, 'test-token');
      assert.equal(calledMethod, 'DELETE');
      assert.ok(calledUrl.includes('/api/v1/minigames/official/42'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

