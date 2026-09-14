// frontend/src/__tests__/unit/servicesApi.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  fetchRoster,
  fetchPoolSummary,
  fetchRun as fetchPageRun,
  startRun as startPageRun,
  submitResult as submitPageResult,
  resetRun as resetPageRun,
  fetchStats as fetchPageStats,
} from '@/utils/../services/pageStreakApi';
import {
  fetchRun as fetchGauntletRun,
  submitMatchResult as submitGauntletResult,
  revealTarget as revealGauntletTarget,
  resetRun as resetGauntletRun,
  fetchStats as fetchGauntletStats,
} from '@/utils/../services/gauntletStreakApi';
import { createStreakApiClient } from '@/utils/../services/streakApiClient';

test('servicesApi: pageStreakApi and gauntletStreakApi operations', async (t) => {
  const originalFetch = globalThis.fetch;

  await t.test('pageStreakApi: fetchRoster, fetchRun, and submitResult', async () => {
    globalThis.fetch = async (url: any, opts?: any) => {
      assert.ok(opts?.headers?.Authorization === 'Bearer test-token');
      if (String(url).includes('/roster')) {
        return {
          ok: true,
          json: async () => ({
            count: 1,
            data: [{ killer: 'The Trapper', status: 'not_started', attempt: 1, current_page: 1, best_page: 1, page_count: 5 }],
            milestone: { completed: false, full_roster: false, killer_count: null },
          }),
        } as Response;
      }
      if (String(url).includes('/run/start')) {
        return { ok: true, json: async () => ({ run: { killer: 'The Trapper', current_page: 1 } }) } as Response;
      }
      if (String(url).includes('/run/result')) {
        return { ok: true, json: async () => ({ run: { killer: 'The Trapper', current_page: 2 } }) } as Response;
      }
      return { ok: true, json: async () => ({ run: null }) } as Response;
    };

    const { roster, milestone } = await fetchRoster('test-token');
    assert.strictEqual(roster.length, 1);
    assert.strictEqual(roster[0].killer, 'The Trapper');
    assert.strictEqual(milestone.completed, false);

    const started = await startPageRun('test-token', 'The Trapper');
    assert.strictEqual(started.current_page, 1);

    const submitted = await submitPageResult('test-token', 'The Trapper', 1, ['perk1'], 'win');
    assert.strictEqual(submitted.current_page, 2);
  });

  await t.test('gauntletStreakApi: fetchRun, submitMatchResult, and revealTarget', async () => {
    globalThis.fetch = async (url: any, opts?: any) => {
      assert.ok(opts?.headers?.Authorization === 'Bearer test-token');
      if (String(url).includes('/result')) {
        return { ok: true, json: async () => ({ run: { id: 1, current_streak: 3 }, previous_run: { id: 1, current_streak: 2 } }) } as Response;
      }
      if (String(url).includes('/reveal')) {
        return { ok: true, json: async () => ({ run: { id: 1, current_character_id: 'meg_thomas' } }) } as Response;
      }
      return { ok: true, json: async () => ({ run: { id: 1, current_streak: 2 } }) } as Response;
    };

    const runRes = await fetchGauntletRun('test-token', 'killer');
    assert.strictEqual(runRes.run.current_streak, 2);

    const submitRes = await submitGauntletResult('test-token', 'killer', 1, 'win');
    assert.strictEqual(submitRes.run.current_streak, 3);

    const revealed = await revealGauntletTarget('test-token', 1);
    assert.strictEqual(revealed.current_character_id, 'meg_thomas');
  });

  await t.test('createStreakApiClient helper factory attaches Bearer auth header', async () => {
    let capturedHeaders: any = null;
    globalThis.fetch = async (url: any, opts: any) => {
      capturedHeaders = opts?.headers;
      return { ok: true, json: async () => ({ ok: true }) } as Response;
    };

    const client = createStreakApiClient('test-mode');
    await client.getJson('jwt-token-123', '/status');
    assert.strictEqual(capturedHeaders?.Authorization, 'Bearer jwt-token-123');

    await client.postJson('jwt-token-123', '/update', { score: 10 });
    assert.strictEqual(capturedHeaders?.Authorization, 'Bearer jwt-token-123');
    assert.strictEqual(capturedHeaders?.['Content-Type'], 'application/json');
  });

  globalThis.fetch = originalFetch;
});
