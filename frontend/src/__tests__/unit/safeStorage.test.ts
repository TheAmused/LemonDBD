// frontend/src/__tests__/unit/safeStorage.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getLocalStorage, safeGetItem, safeSetItem, safeRemoveItem } from '@/utils/safeStorage';

const g = globalThis as { localStorage?: Storage };
let original: Storage | undefined;

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe('safeStorage', () => {
  beforeEach(() => {
    original = g.localStorage;
  });
  afterEach(() => {
    g.localStorage = original;
  });

  it('round-trips values through the globalThis storage', () => {
    g.localStorage = memoryStorage();
    assert.strictEqual(safeSetItem('a', '1'), true);
    assert.strictEqual(safeGetItem('a'), '1');
    safeRemoveItem('a');
    assert.strictEqual(safeGetItem('a'), null);
  });

  it('returns null / false when no storage exists', () => {
    g.localStorage = undefined;
    assert.strictEqual(getLocalStorage(), null);
    assert.strictEqual(safeGetItem('a'), null);
    assert.strictEqual(safeSetItem('a', '1'), false);
    assert.doesNotThrow(() => safeRemoveItem('a'));
  });

  it('swallows storage errors', () => {
    const boom = () => {
      throw new Error('blocked');
    };
    g.localStorage = { getItem: boom, setItem: boom, removeItem: boom } as unknown as Storage;
    assert.strictEqual(safeGetItem('a'), null);
    assert.strictEqual(safeSetItem('a', '1'), false);
    assert.doesNotThrow(() => safeRemoveItem('a'));
  });
});
