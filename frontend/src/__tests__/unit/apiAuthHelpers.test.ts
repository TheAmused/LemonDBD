// frontend/src/__tests__/unit/apiAuthHelpers.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  AUTH_TOKEN_KEY,
  ApiError,
  authFetch,
  authHeaders,
  getAuthToken,
  getErrorMessage,
} from '@/utils/api';
import { ShowcaseApiError } from '@/services/userShowcaseApi';
import { ApiError as ProfileApiError } from '@/services/userProfileApi';

const g = globalThis as { localStorage?: Storage; fetch: typeof fetch };
let origStorage: Storage | undefined;
let origFetch: typeof fetch;
const store: Record<string, string> = {};

describe('auth helpers', () => {
  beforeEach(() => {
    origStorage = g.localStorage;
    origFetch = g.fetch;
    for (const k of Object.keys(store)) delete store[k];
    g.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => void (store[k] = v),
      removeItem: (k: string) => void delete store[k],
    } as unknown as Storage;
  });
  afterEach(() => {
    g.localStorage = origStorage;
    g.fetch = origFetch;
  });

  it('getAuthToken reads the persisted token', () => {
    assert.strictEqual(getAuthToken(), null);
    store[AUTH_TOKEN_KEY] = 'abc';
    assert.strictEqual(getAuthToken(), 'abc');
  });

  it('authHeaders builds Bearer + optional JSON content type', () => {
    assert.deepStrictEqual(authHeaders('t'), { Authorization: 'Bearer t' });
    assert.deepStrictEqual(authHeaders('t', { json: true }), {
      Authorization: 'Bearer t',
      'Content-Type': 'application/json',
    });
    assert.deepStrictEqual(authHeaders(null), {});
    store[AUTH_TOKEN_KEY] = 'stored';
    assert.deepStrictEqual(authHeaders(), { Authorization: 'Bearer stored' });
  });

  it('authFetch attaches the header and lets caller headers win', async () => {
    let seen: Headers | undefined;
    g.fetch = (async (_i: unknown, init?: RequestInit) => {
      seen = new Headers(init?.headers);
      return new Response('{}');
    }) as typeof fetch;
    await authFetch('/x', { token: 'tok', headers: { 'X-Test': '1' } });
    assert.strictEqual(seen?.get('authorization'), 'Bearer tok');
    assert.strictEqual(seen?.get('x-test'), '1');
    await authFetch('/x', { token: 'tok', headers: { Authorization: 'Custom' } });
    assert.strictEqual(seen?.get('authorization'), 'Custom');
  });

  it('getErrorMessage prefers Error.message, else fallback', () => {
    assert.strictEqual(getErrorMessage(new Error('boom'), 'fb'), 'boom');
    assert.strictEqual(getErrorMessage(new Error(''), 'fb'), 'fb');
    assert.strictEqual(getErrorMessage('str', 'fb'), 'fb');
    assert.strictEqual(getErrorMessage(undefined, 'fb'), 'fb');
  });

  it('ApiError is shared by the profile and showcase clients', () => {
    assert.strictEqual(ProfileApiError, ApiError);
    assert.strictEqual(ShowcaseApiError, ApiError);
    const e = new ApiError('m', 401, 'code');
    assert.ok(e instanceof Error);
    assert.deepStrictEqual([e.status, e.code, e.name], [401, 'code', 'ApiError']);
  });
});
