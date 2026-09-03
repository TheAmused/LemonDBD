// frontend/src/__tests__/unit/umamiConfigApi.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  GET,
  provisionWebsite,
  getRuntimePublicUrl,
  _resetUmamiConfigCache,
} from '@/app/api/umami-config/route';

test('Umami Config API & Auto-Provisioning Route Handler', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  t.beforeEach(() => {
    _resetUmamiConfigCache();
    process.env.UMAMI_INTERNAL_URL = 'http://umami:3000';
    process.env.UMAMI_ADMIN_USERNAME = 'admin';
    process.env.UMAMI_ADMIN_PASSWORD = 'umami';
    process.env.UMAMI_SITE_NAME = 'LemonDBD';
    process.env.UMAMI_SITE_DOMAIN = 'localhost';
    process.env.NEXT_PUBLIC_UMAMI_URL = 'https://localhost:8117';
    delete process.env.UMAMI_PUBLIC_URL;
  });

  t.afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    _resetUmamiConfigCache();
  });

  await t.test('getRuntimePublicUrl trims trailing slashes from public URL', () => {
    process.env.NEXT_PUBLIC_UMAMI_URL = 'https://analytics.example.com:8117///';
    assert.strictEqual(getRuntimePublicUrl(), 'https://analytics.example.com:8117');

    process.env.UMAMI_PUBLIC_URL = 'https://custom.example.com/';
    assert.strictEqual(getRuntimePublicUrl(), 'https://custom.example.com');
  });

  await t.test('GET returns empty websiteId and url when NEXT_PUBLIC_UMAMI_URL is blank', async () => {
    delete process.env.NEXT_PUBLIC_UMAMI_URL;
    delete process.env.UMAMI_PUBLIC_URL;

    const res = await GET();
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(json, { websiteId: '', url: '' });
  });

  await t.test('provisionWebsite handles Umami v2 { data: { id } } envelope', async () => {
    let loginCalled = false;
    let websitesGetCalled = false;
    let websitePostCalled = false;

    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/auth/login')) {
        loginCalled = true;
        const body = JSON.parse(init?.body || '{}');
        assert.strictEqual(body.username, 'admin');
        assert.strictEqual(body.password, 'umami');
        return {
          ok: true,
          json: async () => ({ token: 'mock-jwt-token-123' }),
        } as unknown as Response;
      }
      if (urlStr.includes('/api/websites') && (!init?.method || init.method === 'GET')) {
        websitesGetCalled = true;
        assert.strictEqual(init?.headers?.Authorization, 'Bearer mock-jwt-token-123');
        return {
          ok: true,
          json: async () => ({ data: [], count: 0, page: 1, pageSize: 100 }),
        } as unknown as Response;
      }
      if (urlStr.includes('/api/websites') && init?.method === 'POST') {
        websitePostCalled = true;
        assert.strictEqual(init?.headers?.Authorization, 'Bearer mock-jwt-token-123');
        const body = JSON.parse(init?.body || '{}');
        assert.strictEqual(body.name, 'LemonDBD');
        assert.strictEqual(body.domain, 'localhost');
        return {
          ok: true,
          json: async () => ({
            data: {
              id: 'umami-v2-uuid-999',
              name: 'LemonDBD',
              domain: 'localhost',
            },
          }),
        } as unknown as Response;
      }
      throw new Error(`Unexpected fetch to ${urlStr}`);
    }) as typeof globalThis.fetch;

    const siteId = await provisionWebsite();
    assert.ok(loginCalled, 'login endpoint should be called');
    assert.ok(websitesGetCalled, 'websites listing should be queried');
    assert.ok(websitePostCalled, 'websites POST endpoint should be called');
    assert.strictEqual(siteId, 'umami-v2-uuid-999');
  });

  await t.test('provisionWebsite handles legacy { id } direct response shape', async () => {
    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/auth/login')) {
        return { ok: true, json: async () => ({ token: 'tok' }) } as unknown as Response;
      }
      if (urlStr.includes('/api/websites') && (!init?.method || init.method === 'GET')) {
        return { ok: true, json: async () => [] } as unknown as Response;
      }
      if (urlStr.includes('/api/websites') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ id: 'legacy-uuid-456' }) } as unknown as Response;
      }
      throw new Error(`Unexpected fetch to ${urlStr}`);
    }) as typeof globalThis.fetch;

    const siteId = await provisionWebsite();
    assert.strictEqual(siteId, 'legacy-uuid-456');
  });

  await t.test('provisionWebsite reuses existing website by sanitized domain without POST', async () => {
    let postCalled = false;
    process.env.UMAMI_SITE_DOMAIN = 'https://example.com/';

    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/auth/login')) {
        return { ok: true, json: async () => ({ token: 'tok' }) } as unknown as Response;
      }
      if (urlStr.includes('/api/websites') && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 'existing-uuid-111', domain: 'example.com', name: 'OtherName' },
            ],
          }),
        } as unknown as Response;
      }
      if (init?.method === 'POST') {
        postCalled = true;
      }
      throw new Error(`Unexpected fetch to ${urlStr}`);
    }) as typeof globalThis.fetch;

    const siteId = await provisionWebsite();
    assert.strictEqual(siteId, 'existing-uuid-111');
    assert.strictEqual(postCalled, false);
  });

  await t.test('GET handler caches website ID in memory across successive calls', async () => {
    let fetchCount = 0;
    globalThis.fetch = (async (url: any, init?: any) => {
      fetchCount++;
      const urlStr = String(url);
      if (urlStr.includes('/api/auth/login')) {
        return { ok: true, json: async () => ({ token: 'tok' }) } as unknown as Response;
      }
      if (urlStr.includes('/api/websites') && (!init?.method || init.method === 'GET')) {
        return { ok: true, json: async () => ({ data: [{ id: 'cached-uuid', domain: 'localhost' }] }) } as unknown as Response;
      }
      throw new Error(`Unexpected fetch to ${urlStr}`);
    }) as typeof globalThis.fetch;

    const res1 = await GET();
    const data1 = await res1.json();
    assert.strictEqual(data1.websiteId, 'cached-uuid');
    assert.strictEqual(data1.url, 'https://localhost:8117');
    assert.strictEqual(fetchCount, 2);

    const res2 = await GET();
    const data2 = await res2.json();
    assert.strictEqual(data2.websiteId, 'cached-uuid');
    assert.strictEqual(fetchCount, 2);
  });

  await t.test('GET handles provisioning error gracefully without caching failure', async () => {
    let attempt = 0;
    globalThis.fetch = (async () => {
      attempt++;
      return {
        ok: false,
        status: 401,
        text: async () => 'Invalid credentials',
      } as unknown as Response;
    }) as typeof globalThis.fetch;

    const res1 = await GET();
    const data1 = await res1.json();
    assert.strictEqual(data1.websiteId, '');
    assert.strictEqual(attempt, 1);

    const res2 = await GET();
    const data2 = await res2.json();
    assert.strictEqual(data2.websiteId, '');
    assert.strictEqual(attempt, 2);
  });
});
