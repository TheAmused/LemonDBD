// frontend/src/__tests__/unit/dataCache.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { fetchCached, fetchJson, invalidate, onInvalidated, readCache, subscribe, writeCache } from '@/services/dataCache';

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

test('a response to a question asked before an invalidation is not written back', async () => {
  const key = '/api/v1/perks?lang=race';
  const before = deferred<string>();
  const stale = fetchCached(key, () => before.promise, { force: true });

  invalidate(key);
  const fresh = await fetchCached(key, () => Promise.resolve('after the change'), { force: true });
  before.resolve('before the change');
  await stale;

  assert.strictEqual(fresh, 'after the change');
  assert.strictEqual(readCache(key), 'after the change');
});

test('invalidate makes the next fetch start a new request instead of joining the running one', async () => {
  const key = '/api/v1/perks?lang=join';
  const running = deferred<string>();
  let started = 0;
  const first = fetchCached(key, () => {
    started += 1;
    return running.promise;
  }, { force: true });

  invalidate(key);
  const second = fetchCached(key, () => {
    started += 1;
    return Promise.resolve('new');
  }, { force: true });

  assert.strictEqual(await second, 'new');
  assert.strictEqual(started, 2);
  running.resolve('old');
  await first;
  assert.strictEqual(readCache(key), 'new');
});

test('a request that finishes after its key was invalidated does not drop its replacement from flight', async () => {
  const key = '/api/v1/perks?lang=replacement';
  const slowOld = deferred<string>();
  const slowNew = deferred<string>();
  const old = fetchCached(key, () => slowOld.promise, { force: true });
  invalidate(key);
  let started = 0;
  const replacement = fetchCached(key, () => {
    started += 1;
    return slowNew.promise;
  }, { force: true });

  slowOld.resolve('old');
  await old;
  // The replacement is still the request in flight, so a third caller joins it.
  const joined = fetchCached(key, () => {
    started += 1;
    return Promise.resolve('unused');
  }, { force: true });
  slowNew.resolve('new');

  assert.strictEqual(await replacement, 'new');
  assert.strictEqual(await joined, 'new');
  assert.strictEqual(started, 1);
});

test('the cache holds a bounded number of entries and keeps the ones on screen', () => {
  const watched = '/api/v1/watched';
  writeCache(watched, 'visible');
  const stop = subscribe(watched, () => {});
  for (let n = 0; n < 80; n += 1) writeCache(`/api/v1/perks?page=${n}&lang=cap`, n);

  assert.strictEqual(readCache(watched), 'visible');
  assert.strictEqual(readCache('/api/v1/perks?page=79&lang=cap'), 79);
  assert.strictEqual(readCache('/api/v1/perks?page=0&lang=cap'), undefined);
  stop();
});

test('fetchJson asks the browser to revalidate instead of answering from its HTTP cache', async () => {
  const seen: Array<RequestInit | undefined> = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    seen.push(init);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    await fetchJson('/api/v1/perks');
    await fetchJson('/api/v1/perks', { cache: 'reload' });
  } finally {
    globalThis.fetch = realFetch;
  }

  assert.strictEqual(seen[0]?.cache, 'no-cache');
  assert.strictEqual(seen[1]?.cache, 'reload');
});
