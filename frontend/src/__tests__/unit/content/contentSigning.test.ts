// frontend/src/__tests__/unit/content/contentSigning.test.ts
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  type ContentManifest,
  embedManifest,
  isContentManifest,
  signExportPayload,
  stripManifest,
} from '@/utils/contentSigning';
import {
  decodeShareText,
  encodeShareText,
  sanitizeManifest,
} from '@/utils/shareCodec';

const MOCK_MANIFEST: ContentManifest = {
  content_type: 'tier_list',
  content_hash: 'a'.repeat(64),
  author_id: 42,
  author_login: 'trapper_main',
  signature: 'b'.repeat(64),
  created_at: '2026-10-14T12:00:00Z',
};

describe('contentSigning: signExportPayload', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('successfully signs payload and returns valid ContentManifest', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...MOCK_MANIFEST }),
      } as Response;
    };

    const doc = {
      title: 'Meta Killer Tier List',
      tiers: ['S', 'A', 'B'],
    };

    const manifest = await signExportPayload('tier_list', doc);
    assert.ok(manifest !== null);
    assert.equal(manifest.content_type, 'tier_list');
    assert.equal(manifest.content_hash, 'a'.repeat(64));
    assert.equal(manifest.author_id, 42);
    assert.equal(manifest.author_login, 'trapper_main');
    assert.equal(manifest.signature, 'b'.repeat(64));
    assert.equal(manifest.created_at, '2026-10-14T12:00:00Z');

    assert.ok(capturedUrl.endsWith('/api/v1/content/sign'));
    assert.equal(capturedInit?.method, 'POST');
    assert.equal(capturedInit?.credentials, 'include');

    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get('content-type'), 'application/json');

    const sentBody = JSON.parse(String(capturedInit?.body));
    assert.equal(sentBody.content_type, 'tier_list');
    assert.deepEqual(sentBody.payload, doc);
  });

  it('strips existing _manifest from payload before signing', async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        json: async () => ({ ...MOCK_MANIFEST }),
      } as Response;
    };

    const docWithOldManifest = {
      title: 'Meta Killer Tier List',
      tiers: ['S', 'A'],
      _manifest: {
        content_type: 'old',
        content_hash: 'c'.repeat(64),
        author_id: 1,
        author_login: 'old_author',
        signature: 'd'.repeat(64),
        created_at: '2025-01-01T00:00:00Z',
      },
    };

    await signExportPayload('tier_list', docWithOldManifest);
    const sentBody = JSON.parse(String(capturedInit?.body));
    assert.equal(sentBody.payload._manifest, undefined);
    assert.equal(sentBody.payload.title, 'Meta Killer Tier List');
  });

  it('handles 401 unauthenticated gracefully by returning null', async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      }) as Response;

    const result = await signExportPayload('tier_list', { title: 'Test' });
    assert.equal(result, null);
  });

  it('handles 500 server error gracefully by returning null', async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      }) as Response;

    const result = await signExportPayload('tier_list', { title: 'Test' });
    assert.equal(result, null);
  });

  it('handles network errors gracefully by returning null', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch (network error)');
    };

    const result = await signExportPayload('tier_list', { title: 'Test' });
    assert.equal(result, null);
  });

  it('returns null if response payload fails ContentManifest validation', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ content_type: 'tier_list' }), // missing hash, signature, etc.
      }) as Response;

    const result = await signExportPayload('tier_list', { title: 'Test' });
    assert.equal(result, null);
  });
});

describe('contentSigning: embedManifest & stripManifest', () => {
  it('embeds _manifest into document payload serialization', () => {
    const doc = {
      format: 'lemondbd-tier-list',
      version: 1,
      title: 'Top Survivor Perks',
    };

    const embedded = embedManifest(doc, MOCK_MANIFEST);
    assert.deepEqual(embedded._manifest, MOCK_MANIFEST);
    assert.equal(embedded.title, 'Top Survivor Perks');

    // Serializes to JSON containing _manifest
    const json = JSON.stringify(embedded, null, 2);
    const parsed = JSON.parse(json);
    assert.ok(parsed._manifest);
    assert.equal(parsed._manifest.author_login, 'trapper_main');
    assert.equal(parsed._manifest.signature, 'b'.repeat(64));
  });

  it('embedManifest returns payload without _manifest when manifest is null', () => {
    const doc = {
      title: 'Solo Queue Tier List',
    };

    const result = embedManifest(doc, null);
    assert.equal(result._manifest, undefined);
    assert.equal(result.title, 'Solo Queue Tier List');
  });

  it('stripManifest cleanly removes _manifest leaving rest of document intact', () => {
    const doc = {
      title: 'Smash Roster',
      entities: [1, 2, 3],
      _manifest: MOCK_MANIFEST,
    };

    const stripped = stripManifest(doc);
    assert.equal((stripped as Record<string, unknown>)._manifest, undefined);
    assert.equal(stripped.title, 'Smash Roster');
    assert.deepEqual(stripped.entities, [1, 2, 3]);
  });
});

describe('contentSigning: isContentManifest', () => {
  it('validates a genuine manifest', () => {
    assert.equal(isContentManifest(MOCK_MANIFEST), true);
  });

  it('rejects invalid or incomplete manifests', () => {
    assert.equal(isContentManifest(null), false);
    assert.equal(isContentManifest(undefined), false);
    assert.equal(isContentManifest('string'), false);
    assert.equal(isContentManifest({ ...MOCK_MANIFEST, author_id: 'not-a-number' }), false);
    assert.equal(isContentManifest({ ...MOCK_MANIFEST, signature: '' }), false);
    assert.equal(isContentManifest({ ...MOCK_MANIFEST, content_hash: 'short' }), false);
    assert.equal(isContentManifest({ ...MOCK_MANIFEST, author_id: -5 }), false);
    assert.equal(isContentManifest({ ...MOCK_MANIFEST, content_hash: 'z'.repeat(64) }), false);
    assert.equal(isContentManifest({ ...MOCK_MANIFEST, signature: 'g'.repeat(64) }), false);
  });
});

describe('shareCodec: manifest handling and round-trip', () => {
  it('safely parses documents that include _manifest through encode/decodeShareText', async () => {
    const originalDoc = {
      title: 'Shared List With Signature',
      items: ['perk-1', 'perk-2'],
      _manifest: MOCK_MANIFEST,
    };

    const shareText = await encodeShareText(JSON.stringify(originalDoc));
    assert.ok(typeof shareText === 'string');

    const decoded = await decodeShareText(shareText, 50_000);
    assert.equal(decoded.ok, true);
    if (!decoded.ok) return;

    const parsed = JSON.parse(decoded.text);
    assert.equal(parsed.title, 'Shared List With Signature');
    assert.deepEqual(parsed._manifest, MOCK_MANIFEST);
  });

  it('sanitizeManifest safely validates and cleans untrusted manifest data', () => {
    const valid = sanitizeManifest(MOCK_MANIFEST);
    assert.deepEqual(valid, MOCK_MANIFEST);

    const corrupt = sanitizeManifest({
      ...MOCK_MANIFEST,
      signature: 'too-short',
    });
    assert.equal(corrupt, null);

    const nonHex = sanitizeManifest({
      ...MOCK_MANIFEST,
      content_hash: 'x'.repeat(64),
    });
    assert.equal(nonHex, null);

    assert.equal(sanitizeManifest(null), null);
    assert.equal(sanitizeManifest({}), null);
    assert.equal(sanitizeManifest({ ...MOCK_MANIFEST, author_id: 0 }), null);
  });
});
