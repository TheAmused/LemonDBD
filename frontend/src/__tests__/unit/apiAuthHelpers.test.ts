// frontend/src/__tests__/unit/apiAuthHelpers.test.ts
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  SESSION_FLAG_KEY,
  SESSION_MARKER,
  LEGACY_AUTH_TOKEN_KEY,
  setSessionFlag,
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

  it('getAuthToken is only a signed-in marker; the JWT itself is never stored', () => {
    assert.strictEqual(getAuthToken(), null);
    store[LEGACY_AUTH_TOKEN_KEY] = 'old-jwt';
    assert.strictEqual(getAuthToken(), null, 'a legacy stored token no longer counts as a session');
    setSessionFlag(true);
    assert.strictEqual(getAuthToken(), SESSION_MARKER);
    assert.strictEqual(store[LEGACY_AUTH_TOKEN_KEY], undefined, 'legacy token is wiped');
    assert.strictEqual(store[SESSION_FLAG_KEY], '1');
    setSessionFlag(false);
    assert.strictEqual(getAuthToken(), null);
  });

  it('authHeaders: explicit JWT -> Bearer; marker / none -> no Authorization (cookie auth)', () => {
    assert.deepStrictEqual(authHeaders('t'), { Authorization: 'Bearer t' });
    assert.deepStrictEqual(authHeaders('t', { json: true }), {
      Authorization: 'Bearer t',
      'Content-Type': 'application/json',
    });
    assert.deepStrictEqual(authHeaders(null), {});
    assert.deepStrictEqual(authHeaders(SESSION_MARKER), {});
    assert.deepStrictEqual(authHeaders(), {});
    assert.deepStrictEqual(authHeaders(undefined, { json: true }), { 'Content-Type': 'application/json' });
  });

  it('authFetch attaches the header and lets caller headers win', async () => {
    let seen: Headers | undefined;
    g.fetch = (async (_i: unknown, init?: RequestInit) => {
      seen = new Headers(init?.headers);
      return new Response('{}');
    }) as typeof fetch;
    let credentials: RequestCredentials | undefined;
    g.fetch = (async (_i: unknown, init?: RequestInit) => {
      seen = new Headers(init?.headers);
      credentials = init?.credentials;
      return new Response('{}');
    }) as typeof fetch;
    await authFetch('/x', { token: 'tok', headers: { 'X-Test': '1' } });
    assert.strictEqual(seen?.get('authorization'), 'Bearer tok');
    assert.strictEqual(seen?.get('x-test'), '1');
    assert.strictEqual(credentials, 'include', 'sends the session cookie');
    await authFetch('/x', { token: SESSION_MARKER });
    assert.strictEqual(seen?.get('authorization'), null);
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
