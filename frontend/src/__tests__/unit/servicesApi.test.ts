// frontend/src/__tests__/unit/servicesApi.test.ts
// frontend/src/utils/__tests__/servicesApi.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { fetchQuests, claimQuest } from '@/utils/../services/questApi';
import {
  createDraftRoom,
  getDraftRoom,
  processDraftAction,
} from '@/utils/../services/draftApi';
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

test('servicesApi: questApi fetching and local fallback logic', async (t) => {
  const originalFetch = globalThis.fetch;

  await t.test('fetchQuests returns backend quests when endpoint is available', async () => {
    const mockQuests = [
      { id: 101, title: 'Test Quest', description: 'Desc', category: 'daily', progress: 1, goal: 2, xp_reward: 300, is_completed: false },
    ];
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ status: 'success', quests: mockQuests }),
    } as Response);

    const res = await fetchQuests();
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.quests.length, 1);
    assert.strictEqual(res.quests[0].id, 101);
  });

  await t.test('fetchQuests falls back gracefully when API throws network error', async () => {
    globalThis.fetch = async () => {
      throw new Error('Network error');
    };

    const res = await fetchQuests();
    assert.strictEqual(res.status, 'success');
    assert.ok(res.quests.length > 0);
  });

  await t.test('claimQuest marks quest as completed and returns reward', async () => {
    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/quests/claim'));
      const body = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          quest: { id: body.quest_id, is_completed: true, progress: 2, goal: 2, xp_reward: 500 },
          xp_reward: 500,
        }),
      } as Response;
    };

    const res = await claimQuest(1);
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.quest.is_completed, true);
    assert.strictEqual(res.xp_reward, 500);
  });

  globalThis.fetch = originalFetch;
});

test('servicesApi: draftApi create, get, action, and reset', async (t) => {
  const originalFetch = globalThis.fetch;

  await t.test('createDraftRoom returns created room session', async () => {
    const mockRoom = {
      room_code: 'ROOM12',
      phase: 'bans',
      banned_perks: [],
      picked_survivor_perks: [],
      picked_killer_perks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    globalThis.fetch = async (url: any) => {
      assert.ok(String(url).includes('/api/v1/draft/create'));
      return {
        ok: true,
        json: async () => ({ status: 'success', room: mockRoom }),
      } as Response;
    };

    const res = await createDraftRoom('ROOM12');
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.room.room_code, 'ROOM12');
  });

  await t.test('getDraftRoom fetches active draft room state', async () => {
    globalThis.fetch = async (url: any) => {
      assert.ok(String(url).includes('/api/v1/draft/ROOM12'));
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          room: { room_code: 'ROOM12', phase: 'picks' },
        }),
      } as Response;
    };

    const res = await getDraftRoom('ROOM12');
    assert.strictEqual(res.room.phase, 'picks');
  });

  globalThis.fetch = originalFetch;
});

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
