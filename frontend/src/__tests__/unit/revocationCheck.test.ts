// frontend/src/__tests__/unit/revocationCheck.test.ts
//
// Banned content is stopped at import and open time by asking the server to hash the document
// itself, so stripping the author stamp does not get around a ban.
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkDocument, isDocumentRevoked } from '@/utils/contentRevocation';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const DOC = { title: 'A trial', description: '', game_mode: 'custom', rounds: [] };

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
    return handler(String(input), init);
  }) as typeof fetch;
  return calls;
}

describe('isDocumentRevoked', () => {
  it('is true only when the server says the document hash is banned', async () => {
    const calls = stubFetch(async () => new Response(JSON.stringify({ revoked: true, content_hash: 'x' }), { status: 200 }));
    assert.equal(await isDocumentRevoked('minigame', DOC), true);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.endsWith('/api/v1/content/revocations/check-document'));
  });

  it('sends the normalised payload, never the author stamp', async () => {
    const calls = stubFetch(async () => new Response(JSON.stringify({ revoked: false }), { status: 200 }));
    await isDocumentRevoked('minigame', { ...DOC, _manifest: { signature: 'x' }, id: 'local-id' });
    const body = calls[0].body as { payload: Record<string, unknown> };
    assert.ok(!('_manifest' in body.payload));
    assert.ok(!('id' in body.payload), 'storage-only fields are not part of the hashed document');
  });

  it('treats a failing or unreachable API as not revoked, so moderation never blocks the site', async () => {
    stubFetch(async () => new Response('boom', { status: 500 }));
    assert.equal(await isDocumentRevoked('minigame', DOC), false);
    stubFetch(async () => {
      throw new Error('offline');
    });
    assert.equal(await isDocumentRevoked('minigame', DOC), false);
  });

  it('does not call the server for something that is not a document', async () => {
    const calls = stubFetch(async () => new Response('{}', { status: 200 }));
    assert.equal(await isDocumentRevoked('tier_list', null), false);
    assert.equal(calls.length, 0);
  });
});

describe('checkDocument (creator signature enforcement)', () => {
  it('sends the stamp so the server can verify it, and reports what the server decided', async () => {
    const manifest = { content_hash: 'a'.repeat(64), author_id: 3, author_login: 'x', signature: 'b'.repeat(64) };
    const calls = stubFetch(async () => new Response(JSON.stringify({ revoked: false, signed: true }), { status: 200 }));
    assert.deepEqual(await checkDocument('minigame', { ...DOC, _manifest: manifest }), { revoked: false, signed: true });
    assert.deepEqual((calls[0].body as { manifest: unknown }).manifest, manifest);
  });

  it('a definite "not signed" is reported, an unreachable server is not (signed stays null)', async () => {
    stubFetch(async () => new Response(JSON.stringify({ revoked: false, signed: false }), { status: 200 }));
    assert.equal((await checkDocument('minigame', DOC)).signed, false);
    stubFetch(async () => new Response('boom', { status: 500 }));
    assert.deepEqual(await checkDocument('minigame', DOC), { revoked: false, signed: null });
    stubFetch(async () => {
      throw new Error('offline');
    });
    assert.deepEqual(await checkDocument('minigame', DOC), { revoked: false, signed: null });
  });
});
