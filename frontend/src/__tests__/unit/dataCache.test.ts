// frontend/src/__tests__/unit/dataCache.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { invalidate, onInvalidated, readCache, writeCache } from '@/services/dataCache';

// writeCache only writes in a browser; the cache is exercised as one here.
Object.assign(globalThis, { window: {} });

const CHARACTERS = '/api/v1/characters?lang=en';

test('invalidate drops the entry and revalidates a key that is still on screen', () => {
  writeCache(CHARACTERS, ['Dwight']);
  let refetches = 0;
  const stop = onInvalidated(CHARACTERS, () => {
    refetches += 1;
  });

  invalidate('/api/v1/characters');

  assert.strictEqual(readCache(CHARACTERS), undefined);
  assert.strictEqual(refetches, 1);
  stop();
});

test('invalidate leaves keys outside the prefix alone', () => {
  writeCache('/api/v1/perks?lang=en', ['Sprint Burst']);
  let refetches = 0;
  const stop = onInvalidated('/api/v1/perks?lang=en', () => {
    refetches += 1;
  });

  invalidate('/api/v1/characters');

  assert.deepStrictEqual(readCache('/api/v1/perks?lang=en'), ['Sprint Burst']);
  assert.strictEqual(refetches, 0);
  stop();
});

test('a consumer that unmounted is no longer revalidated', () => {
  writeCache(CHARACTERS, ['Dwight']);
  let refetches = 0;
  const stop = onInvalidated(CHARACTERS, () => {
    refetches += 1;
  });
  stop();

  invalidate('/api/v1/characters');

  assert.strictEqual(refetches, 0);
});

test('invalidate with no prefix revalidates every watched key once', () => {
  writeCache(CHARACTERS, ['Dwight']);
  writeCache('/api/v1/perks?lang=en', ['Sprint Burst']);
  const seen: string[] = [];
  const stops = [CHARACTERS, '/api/v1/perks?lang=en'].map((key) =>
    onInvalidated(key, () => {
      seen.push(key);
    })
  );

  invalidate();

  assert.deepStrictEqual(seen.sort(), ['/api/v1/characters?lang=en', '/api/v1/perks?lang=en']);
  stops.forEach((stop) => stop());
});
