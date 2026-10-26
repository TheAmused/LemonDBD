// frontend/src/__tests__/unit/smash/smashGuestSession.test.ts
// The smash-or-pass guest session id is a bearer secret: never shared between
// people on one browser, never one fixed fallback string (2026-10-19 review M1/L12).
import test from 'node:test';
import assert from 'node:assert';
import {
  SMASH_SESSION_KEY,
  getSessionId,
  resetSmashGuestStateOnLogout,
  rotateSmashSession,
} from '@/utils/smashOrPass/guestSession';
import { readStoredVotes, writeStoredVotes } from '@/components/smash-or-pass/hub/voteStorage';

function memoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

function withBrowser(storage: Storage, fn: () => void) {
  const g = globalThis as Record<string, unknown>;
  const prevWindow = g.window;
  const prevStorage = g.localStorage;
  g.window = {};
  g.localStorage = storage;
  try {
    fn();
  } finally {
    g.window = prevWindow;
    g.localStorage = prevStorage;
  }
}

const vote = (slug: string) => ({
  character: { id: slug, slug, name: slug, role: 'Survivor', gender: 'female', order_index: 0, roster_id: 'r' },
  vote: 'smash' as const,
  timestamp: 1,
});

test('guest session id is stable until rotated', () => {
  withBrowser(memoryStorage(), () => {
    const first = getSessionId();
    assert.match(first, /^sess_/);
    assert.strictEqual(getSessionId(), first);
    assert.strictEqual(localStorage.getItem(SMASH_SESSION_KEY), first);
    rotateSmashSession();
    assert.notStrictEqual(getSessionId(), first);
  });
});

test('logout gives the next person a new session and drops the account vote cache, keeping local rosters', () => {
  withBrowser(memoryStorage(), () => {
    const before = getSessionId();
    writeStoredVotes('canon', [vote('ada_wong') as never]);
    writeStoredVotes('local:abc', [vote('mine') as never]);

    resetSmashGuestStateOnLogout();

    assert.notStrictEqual(getSessionId(), before);
    assert.deepStrictEqual(readStoredVotes('canon'), []);
    assert.strictEqual(readStoredVotes('local:abc').length, 1);
  });
});

test('without usable storage every tab gets its own random id, not a shared constant', () => {
  const broken = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as unknown as Storage;
  withBrowser(broken, () => {
    const id = getSessionId();
    assert.match(id, /^sess_/);
    assert.notStrictEqual(id, 'fallback_smash_session');
    assert.strictEqual(getSessionId(), id, 'stable within the tab');
    rotateSmashSession();
    assert.notStrictEqual(getSessionId(), id);
  });
});
