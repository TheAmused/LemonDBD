// frontend/src/__tests__/unit/changelogApi.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  fetchChangelogPosts,
  fetchChangelogPostsAdmin,
  createChangelogPost,
  updateChangelogPost,
  deleteChangelogPost,
  reorderChangelogPosts,
} from '@/services/changelogApi';
import type { ChangelogPostDraft } from '@/types/changelog';

test('changelogApi: public + admin CRUD requests', async (t) => {
  const originalFetch = globalThis.fetch;

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  await t.test('fetchChangelogPosts sends a GET with page/per_page and no auth header', async () => {
    let capturedUrl = '';
    let capturedInit: any;
    globalThis.fetch = async (url: any, init?: any) => {
      capturedUrl = String(url);
      capturedInit = init;
      return {
        ok: true,
        json: async () => ({ status: 'success', data: [], page: 2, per_page: 5, total: 0, has_more: false }),
      } as Response;
    };

    const result = await fetchChangelogPosts(2, 5);
    assert.ok(capturedUrl.endsWith('/api/v1/changelog?page=2&per_page=5'));
    assert.strictEqual(capturedInit?.headers, undefined);
    assert.strictEqual(result.page, 2);
  });

  await t.test('fetchChangelogPostsAdmin sends a Bearer token and hits /admin', async () => {
    let capturedUrl = '';
    let capturedHeaders: any;
    globalThis.fetch = async (url: any, init?: any) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers;
      return {
        ok: true,
        json: async () => ({ status: 'success', data: [], page: 1, per_page: 50, total: 0, has_more: false }),
      } as Response;
    };

    await fetchChangelogPostsAdmin('tok-123');
    assert.ok(capturedUrl.includes('/api/v1/changelog/admin?page=1&per_page=50'));
    assert.strictEqual(capturedHeaders.Authorization, 'Bearer tok-123');
  });

  await t.test('createChangelogPost POSTs JSON with auth header and returns the created post', async () => {
    const draft: ChangelogPostDraft = {
      title: 'New Patch',
      content_html: '<p>hi</p>',
      tag: 'feature',
      is_published: true,
    };
    let capturedInit: any;
    globalThis.fetch = async (_url: any, init?: any) => {
      capturedInit = init;
      return {
        ok: true,
        json: async () => ({ status: 'success', data: { id: 1, ...draft, position: 0, author_name: 'lemon', created_at: null, updated_at: null } }),
      } as Response;
    };

    const result = await createChangelogPost('tok-abc', draft);
    assert.strictEqual(capturedInit.method, 'POST');
    assert.strictEqual(capturedInit.headers['Content-Type'], 'application/json');
    assert.strictEqual(capturedInit.headers.Authorization, 'Bearer tok-abc');
    assert.deepStrictEqual(JSON.parse(capturedInit.body), draft);
    assert.strictEqual(result.data.title, 'New Patch');
  });

  await t.test('updateChangelogPost PATCHes only the provided partial fields', async () => {
    let capturedInit: any;
    let capturedUrl = '';
    globalThis.fetch = async (url: any, init?: any) => {
      capturedUrl = String(url);
      capturedInit = init;
      return { ok: true, json: async () => ({ status: 'success', data: {} }) } as Response;
    };

    await updateChangelogPost('tok', 42, { is_published: false });
    assert.ok(capturedUrl.endsWith('/api/v1/changelog/42'));
    assert.strictEqual(capturedInit.method, 'PATCH');
    assert.deepStrictEqual(JSON.parse(capturedInit.body), { is_published: false });
  });

  await t.test('deleteChangelogPost DELETEs the given id with auth header', async () => {
    let capturedUrl = '';
    let capturedInit: any;
    globalThis.fetch = async (url: any, init?: any) => {
      capturedUrl = String(url);
      capturedInit = init;
      return { ok: true, json: async () => ({ status: 'success' }) } as Response;
    };

    await deleteChangelogPost('tok', 7);
    assert.ok(capturedUrl.endsWith('/api/v1/changelog/7'));
    assert.strictEqual(capturedInit.method, 'DELETE');
    assert.strictEqual(capturedInit.headers.Authorization, 'Bearer tok');
  });

  await t.test('reorderChangelogPosts POSTs ordered_ids to /reorder', async () => {
    let capturedUrl = '';
    let capturedBody: any;
    globalThis.fetch = async (url: any, init?: any) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ status: 'success' }) } as Response;
    };

    await reorderChangelogPosts('tok', [3, 1, 2]);
    assert.ok(capturedUrl.endsWith('/api/v1/changelog/reorder'));
    assert.deepStrictEqual(capturedBody, { ordered_ids: [3, 1, 2] });
  });

  await t.test('a non-ok response throws using the server-provided error message', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Admin access required' }),
    } as Response);

    await assert.rejects(
      () => fetchChangelogPostsAdmin('tok'),
      (err: Error) => err.message === 'Admin access required'
    );
  });

  await t.test('a non-ok response with no JSON body falls back to a generic status message', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    } as unknown as Response);

    await assert.rejects(
      () => fetchChangelogPosts(),
      (err: Error) => err.message === 'Request failed with status 500'
    );
  });
});
