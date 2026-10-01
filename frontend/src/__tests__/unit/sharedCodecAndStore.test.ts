// frontend/src/__tests__/unit/sharedCodecAndStore.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '@/utils/slug';
import {
  base64UrlToBytes,
  bytesToBase64Url,
  cleanText,
  decodeShareText,
  encodeShareText,
  readShareFragment,
  sanitizeImageUrl,
  uniqueId,
} from '@/utils/shareCodec';
import { createRandomId, createVersionedStore, isQuotaError } from '@/utils/versionedStore';
import { slugifyEntityId, decodeSharePayload as decodeSmash, encodeSharePayload as encodeSmash } from '@/utils/smashOrPass/codec';
import { slugifyItemId, decodeSharePayload as decodeTier, encodeSharePayload as encodeTier } from '@/utils/tierLists/codec';

function mockStorage(initial: Record<string, string> = {}, setItemError?: Error): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => {
      if (setItemError) throw setItemError;
      map.set(k, v);
    },
  } as Storage;
}

describe('slugify', () => {
  it('strips accents, collapses separators and applies the fallback', () => {
    assert.equal(slugify('Leon S. Kennedy', 'x'), 'leon-s-kennedy');
    assert.equal(slugify('Zoë  Ünïcode!', 'x'), 'zoe-unicode');
    assert.equal(slugify('!!!', 'fallback'), 'fallback');
    assert.equal(slugify('a'.repeat(100), 'x').length, 48);
  });
  it('wrappers keep their own fallback', () => {
    assert.equal(slugifyItemId('***'), 'item');
    assert.equal(slugifyEntityId('***'), 'entity');
  });
});

describe('shareCodec primitives', () => {
  it('base64url round-trips arbitrary bytes without padding or +/', () => {
    const bytes = Uint8Array.from({ length: 300 }, (_, i) => (i * 7) % 256);
    const enc = bytesToBase64Url(bytes);
    assert.match(enc, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual([...base64UrlToBytes(enc)], [...bytes]);
  });

  it('encodeShareText / decodeShareText round-trip (compressed or not)', async () => {
    const json = JSON.stringify({ a: 'héllo', b: [1, 2, 3] });
    const payload = await encodeShareText(json);
    assert.match(payload, /^[zj]\./);
    const decoded = await decodeShareText(payload, 10_000);
    assert.deepEqual(decoded, { ok: true, text: json });
  });

  it('decodeShareText reports empty, oversized and unknown-scheme payloads', async () => {
    assert.deepEqual(await decodeShareText('z.', 100), { ok: false, error: 'invalidShareLink' });
    assert.deepEqual(await decodeShareText('j.' + 'A'.repeat(50), 10), { ok: false, error: 'tooLarge' });
    assert.deepEqual(await decodeShareText('q.AAAA', 100), { ok: false, error: 'invalidShareLink' });
  });

  it('readShareFragment extracts #import= payloads only', () => {
    assert.equal(readShareFragment('#import=z.abc'), 'z.abc');
    assert.equal(readShareFragment('#import=z.'), null);
    assert.equal(readShareFragment('#other=z.abc'), null);
    assert.equal(readShareFragment(''), null);
  });

  it('sanitizeImageUrl allows https, /static and small raster data URLs only', () => {
    assert.equal(sanitizeImageUrl('https://x.test/a.png', 100), 'https://x.test/a.png');
    assert.equal(sanitizeImageUrl('http://x.test/a.png', 100), null);
    assert.equal(sanitizeImageUrl('javascript:alert(1)', 100), null);
    assert.equal(sanitizeImageUrl('/static/a.png', 100), '/static/a.png');
    assert.equal(sanitizeImageUrl('/static/../a.png', 100), null);
    assert.equal(sanitizeImageUrl('data:image/png;base64,AAAA', 100), 'data:image/png;base64,AAAA');
    assert.equal(sanitizeImageUrl('data:image/png;base64,AAAA', 5), null);
    assert.equal(sanitizeImageUrl('data:image/svg+xml;base64,AAAA', 100), null);
  });

  it('cleanText / uniqueId', () => {
    const counter = { truncated: 0 };
    assert.equal(cleanText('  a\u0000  b ', 10), 'a b');
    assert.equal(cleanText('abcdef', 3, counter), 'abc');
    assert.equal(counter.truncated, 1);
    assert.equal(uniqueId('a', new Set(['a', 'a-2'])), 'a-3');
  });

  it('both codecs share the transport but keep their own parsers', async () => {
    const tier = { format: 'lemondbd-tier-list', version: 1, title: 'T', template: null, tiers: [], items: [{ id: 'a', name: 'A' }], placements: {} } as never;
    const payload = await encodeTier(tier);
    const ok = await decodeTier(payload);
    assert.equal(ok.ok, true);
    assert.deepEqual(await decodeTier('z.'), { ok: false, error: 'invalidShareLink' });
    assert.deepEqual(await decodeSmash('zz.!!!notbase64'), { ok: false, error: 'invalidShareLink' });
    assert.equal(typeof encodeSmash, 'function');
  });
});

describe('createVersionedStore', () => {
  const EMPTY = Object.freeze({ version: 1, items: Object.freeze({}) as Record<string, number> });
  type S = typeof EMPTY;
  const migrate = (raw: unknown): S => {
    const items = (raw as { items?: Record<string, number> })?.items;
    return { version: 1, items: items && typeof items === 'object' ? items : {} };
  };

  it('load returns empty for no storage, missing key, and corrupt JSON', () => {
    const store = createVersionedStore<S>({ key: 'k', empty: EMPTY, migrate });
    assert.equal(store.load(null), EMPTY);
    assert.equal(store.load(mockStorage()), EMPTY);
    assert.equal(store.load(mockStorage({ k: '{nope' })), EMPTY);
    assert.deepEqual(store.load(mockStorage({ k: '{"items":{"a":1}}' })).items, { a: 1 });
  });

  it('save reports ok / unavailable / quota', () => {
    const store = createVersionedStore<S>({ key: 'k', empty: EMPTY, migrate });
    assert.deepEqual(store.save(EMPTY, mockStorage()), { ok: true });
    assert.deepEqual(store.save(EMPTY, null), { ok: false, reason: 'unavailable' });
    assert.deepEqual(store.save(EMPTY, mockStorage({}, new Error('boom'))), { ok: false, reason: 'unavailable' });
    const quota = new Error('full');
    quota.name = 'QuotaExceededError';
    assert.deepEqual(store.save(EMPTY, mockStorage({}, quota)), { ok: false, reason: 'quota' });
    assert.equal(isQuotaError(new Error('Quota exceeded')), true);
    assert.equal(isQuotaError('x'), false);
  });

  it('update caches the snapshot, notifies subscribers, and isolates a broken one', () => {
    const g = globalThis as { localStorage?: Storage };
    const prev = g.localStorage;
    g.localStorage = mockStorage();
    try {
      const store = createVersionedStore<S>({ key: 'k', empty: EMPTY, migrate });
      let calls = 0;
      const un1 = store.subscribe(() => { throw new Error('bad subscriber'); });
      const un2 = store.subscribe(() => { calls += 1; });
      const first = store.getSnapshot();
      assert.equal(store.getSnapshot(), first, 'snapshot is referentially stable');
      assert.equal(store.getServerSnapshot(), EMPTY);
      const res = store.update((s) => ({ ...s, items: { ...s.items, a: 1 } }));
      assert.deepEqual(res, { ok: true });
      assert.equal(calls, 1);
      assert.deepEqual(store.getSnapshot().items, { a: 1 });
      store.resetCache();
      assert.deepEqual(store.getSnapshot().items, { a: 1 }, 're-read from storage after reset');
      un1();
      un2();
    } finally {
      g.localStorage = prev;
    }
  });

  it('createRandomId yields 10 base-36 chars', () => {
    assert.match(createRandomId(), /^[0-9a-z]{10}$/);
    assert.notEqual(createRandomId(), createRandomId());
  });
});
