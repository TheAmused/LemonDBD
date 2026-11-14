// frontend/src/__tests__/unit/utils/maintenanceProxy.test.ts
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkMaintenance, isMaintenancePage, resetMaintenanceCache, retryAfterSeconds } from '@/utils/maintenanceProxy';

const LOCALES = ['en', 'pl', 'de', 'es', 'ja'] as const;
const BASE = { backendUrl: 'http://backend:5000', cookie: 'lemondbd_session=abc', clientIp: '203.0.113.9' };

interface Call {
  url: string;
  headers: Record<string, string>;
}

/** A fake fetch that answers `body` (or fails) and records what it was asked. */
function fakeFetch(body: unknown, options: { ok?: boolean; fail?: boolean } = {}): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), headers: (init?.headers ?? {}) as Record<string, string> });
    if (options.fail) throw new Error('backend down');
    return { ok: options.ok ?? true, json: async () => body } as Response;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

describe('checkMaintenance', () => {
  beforeEach(resetMaintenanceCache);

  it('asks the backend with the visitor cookie and address, and reports a blocked visitor', async () => {
    const { fetchImpl, calls } = fakeFetch({ active: true, blocked: true, until: '2030-01-01T00:00:00Z' });
    const verdict = await checkMaintenance({ ...BASE, fetchImpl });
    assert.deepEqual(verdict, { blocked: true, until: '2030-01-01T00:00:00Z' });
    assert.equal(calls[0].url, 'http://backend:5000/api/v1/site-config/maintenance');
    assert.equal(calls[0].headers.cookie, 'lemondbd_session=abc');
    assert.equal(calls[0].headers['x-real-ip'], '203.0.113.9');
  });

  it('lets an allowed visitor or an admin through while maintenance is on, and asks again next time', async () => {
    const { fetchImpl, calls } = fakeFetch({ active: true, blocked: false, until: null });
    assert.deepEqual(await checkMaintenance({ ...BASE, fetchImpl }), { blocked: false, until: null });
    await checkMaintenance({ ...BASE, fetchImpl });
    assert.equal(calls.length, 2, 'the answer depends on the visitor, so it is never reused while maintenance is on');
  });

  it('remembers "off" for a few seconds, then asks again', async () => {
    const { fetchImpl, calls } = fakeFetch({ active: false, blocked: false, until: null });
    await checkMaintenance({ ...BASE, fetchImpl, now: 1_000 });
    await checkMaintenance({ ...BASE, fetchImpl, now: 3_000 });
    assert.equal(calls.length, 1);
    await checkMaintenance({ ...BASE, fetchImpl, now: 7_000 });
    assert.equal(calls.length, 2);
  });

  it('sends no empty headers when there is no cookie or address', async () => {
    const { fetchImpl, calls } = fakeFetch({ active: false });
    await checkMaintenance({ ...BASE, cookie: '', clientIp: '', fetchImpl });
    assert.deepEqual(calls[0].headers, {});
  });

  it('serves the page when the backend cannot answer', async () => {
    assert.deepEqual(await checkMaintenance({ ...BASE, fetchImpl: fakeFetch(null, { fail: true }).fetchImpl }), { blocked: false, until: null });
    assert.deepEqual(await checkMaintenance({ ...BASE, fetchImpl: fakeFetch({ active: true, blocked: true }, { ok: false }).fetchImpl }), { blocked: false, until: null });
  });

  it('does not remember a failed check as "off"', async () => {
    await checkMaintenance({ ...BASE, fetchImpl: fakeFetch(null, { fail: true }).fetchImpl, now: 1_000 });
    const { fetchImpl, calls } = fakeFetch({ active: true, blocked: true, until: null });
    assert.equal((await checkMaintenance({ ...BASE, fetchImpl, now: 1_500 })).blocked, true);
    assert.equal(calls.length, 1);
  });
});

describe('retryAfterSeconds', () => {
  it('counts up to the end of the window, at least one second', () => {
    const now = Date.parse('2030-01-01T00:00:00Z');
    assert.equal(retryAfterSeconds('2030-01-01T01:00:00Z', now), 3600);
    assert.equal(retryAfterSeconds('2029-12-31T00:00:00Z', now), 1);
  });

  it('is null without an end', () => {
    assert.equal(retryAfterSeconds(null), null);
    assert.equal(retryAfterSeconds('not a date'), null);
  });
});

describe('isMaintenancePage', () => {
  it('matches the page in any language and nothing else', () => {
    assert.equal(isMaintenancePage('/en/maintenance', LOCALES), true);
    assert.equal(isMaintenancePage('/pl/maintenance/', LOCALES), true);
    for (const path of ['/en', '/en/perks', '/xx/maintenance', '/maintenance', '/en/admin/maintenance']) {
      assert.equal(isMaintenancePage(path, LOCALES), false, path);
    }
  });
});
