// frontend/src/__tests__/unit/smashOrPass.test.ts
// frontend/src/utils/__tests__/smashOrPass.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { SmashSounds } from '@/utils/../components/smash-or-pass/SmashSoundEffects';

test('SmashOrPass: Tier Classification & Calculations', async (t) => {
  await t.test('calculates correct tier bands for smash rates', () => {
    const getTier = (rate: number) => {
      if (rate >= 85) return 'God Tier';
      if (rate >= 65) return 'Fatal Attraction';
      if (rate >= 40) return 'Friendzone';
      return 'Eldritch Void';
    };

    assert.strictEqual(getTier(95), 'God Tier');
    assert.strictEqual(getTier(85), 'God Tier');
    assert.strictEqual(getTier(75), 'Fatal Attraction');
    assert.strictEqual(getTier(65), 'Fatal Attraction');
    assert.strictEqual(getTier(50), 'Friendzone');
    assert.strictEqual(getTier(40), 'Friendzone');
    assert.strictEqual(getTier(30), 'Eldritch Void');
    assert.strictEqual(getTier(0), 'Eldritch Void');
  });

  await t.test('handles edge case zero votes without NaN', () => {
    const totalVotes = 0;
    const smashCount = 0;
    const rate = totalVotes > 0 ? (smashCount / totalVotes) * 100 : 50;
    assert.strictEqual(rate, 50);
  });
});

test('SmashOrPass: API Service Layer & Types', async (t) => {
  const {
    getSessionId,
    fetchRosters,
    fetchRosterFeed,
    castVote,
    fetchLeaderboard,
    resetSessionVotes,
    resetUserVotes,
    fetchDynamicTranslations,
  } = await import('../../services/smashApi');

  await t.test('getSessionId returns valid session identifier', () => {
    const id = getSessionId();
    assert.ok(typeof id === 'string');
    assert.ok(id.length > 0);
  });

  await t.test('fetchRosters sends request and returns roster array', async () => {
    const originalFetch = globalThis.fetch;
    const mockRosters = [
      {
        id: 'r-1',
        slug: 'canon',
        name_i18n_key: 'smashOrPass.rosters.canon.name',
        description_i18n_key: 'smashOrPass.rosters.canon.desc',
        theme_color: '#ff0055',
        category: 'DBD Canon',
        is_nsfw: false,
        is_active: true,
        entity_count: 98,
        total_votes: 120,
      },
    ];

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/rosters'));
      return {
        ok: true,
        json: async () => ({ data: mockRosters, count: 1 }),
      } as any;
    };

    try {
      const rosters = await fetchRosters(true);
      assert.strictEqual(rosters.length, 1);
      assert.strictEqual(rosters[0].slug, 'canon');
      assert.strictEqual(rosters[0].entity_count, 98);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchRosterFeed queries feed with session header', async () => {
    const originalFetch = globalThis.fetch;
    const mockFeed = {
      roster: { id: 'r-1', slug: 'canon' },
      entities: [
        {
          id: 'e-1',
          roster_id: 'r-1',
          slug: 'ada_wong',
          name: 'Ada Wong',
          role: 'Survivor',
          gender: 'female',
          metadata: { chaos_score: 75, danger_level: 'Moderate' },
        },
      ],
      total_remaining: 97,
    };

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/rosters/canon/feed'));
      assert.ok(opts.headers['X-Session-ID']);
      return {
        ok: true,
        json: async () => ({ data: mockFeed }),
      } as any;
    };

    try {
      const feed = await fetchRosterFeed('canon', { role: 'Survivor', limit: 20 });
      assert.strictEqual(feed.total_remaining, 97);
      assert.strictEqual(feed.entities.length, 1);
      assert.strictEqual(feed.entities[0].name, 'Ada Wong');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('castVote posts vote and returns result', async () => {
    const originalFetch = globalThis.fetch;
    const mockVoteResult = {
      id: 'e-1',
      slug: 'ada_wong',
      name: 'Ada Wong',
      role: 'Survivor',
      gender: 'female',
      smash_count: 5,
      pass_count: 1,
      total_votes: 6,
      smash_rate: 83.3,
    };

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/vote'));
      assert.strictEqual(opts.method, 'POST');
      const body = JSON.parse(opts.body);
      assert.strictEqual(body.entity_id, 'e-1');
      assert.strictEqual(body.vote_type, 'smash');
      return {
        ok: true,
        json: async () => ({ data: mockVoteResult, status: 'success' }),
      } as any;
    };

    try {
      const res = await castVote('e-1', 'smash', 'ada_wong');
      assert.strictEqual(res.status, 'success');
      assert.strictEqual(res.data.smash_count, 5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchLeaderboard returns ranked items', async () => {
    const originalFetch = globalThis.fetch;
    const mockLeaderboard = [
      {
        id: 'e-1',
        slug: 'ada_wong',
        name: 'Ada Wong',
        role: 'Survivor',
        gender: 'female',
        tier: 'God Tier',
        rank: 1,
        smash_rate: 92.5,
      },
    ];

    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/rosters/canon/leaderboard'));
      return {
        ok: true,
        json: async () => ({ data: mockLeaderboard, count: 1 }),
      } as any;
    };

    try {
      const leaderboard = await fetchLeaderboard('canon', { sortBy: 'smash_rate' });
      assert.strictEqual(leaderboard.length, 1);
      assert.strictEqual(leaderboard[0].tier, 'God Tier');
      assert.strictEqual(leaderboard[0].rank, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('resetSessionVotes triggers reset endpoint', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/session/reset'));
      assert.strictEqual(opts.method, 'POST');
      return {
        ok: true,
        json: async () => ({ status: 'success', reset_count: 12 }),
      } as any;
    };

    try {
      const res = await resetSessionVotes('canon');
      assert.strictEqual(res.status, 'success');
      assert.strictEqual(res.reset_count, 12);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('resetUserVotes triggers user reset endpoint', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/user-votes/reset'));
      assert.strictEqual(opts.method, 'POST');
      return {
        ok: true,
        json: async () => ({ status: 'success', reset_count: 5 }),
      } as any;
    };

    try {
      const res = await resetUserVotes('canon');
      assert.strictEqual(res.status, 'success');
      assert.strictEqual(res.reset_count, 5);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('fetchDynamicTranslations requests translation dictionary', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any) => {
      assert.ok(String(url).includes('/translations') || String(url).includes('/api/v1/i18n'));
      return {
        ok: true,
        json: async () => ({ data: { 'smashOrPass.ui.smash': 'スマッシュ' } }),
      } as any;
    };

    try {
      const dict = await fetchDynamicTranslations('ja');
      assert.strictEqual(dict['smashOrPass.ui.smash'], 'スマッシュ');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('SmashOrPass: Sound Effects & Web Audio Synthesizer', async (t) => {
  await t.test('SmashSounds methods can be invoked safely in test environment', () => {
    assert.doesNotThrow(() => SmashSounds.playSmashSound());
    assert.doesNotThrow(() => SmashSounds.playPassSound());
    assert.doesNotThrow(() => SmashSounds.playFlipSound());
    assert.doesNotThrow(() => SmashSounds.playHeartbeat(1.0));
    assert.doesNotThrow(() => SmashSounds.playHoverTick());
  });

  await t.test('SmashSounds mute state toggles correctly', () => {
    const initial = SmashSounds.getIsMuted();
    const toggled = SmashSounds.toggleMute();
    assert.strictEqual(toggled, !initial);
    SmashSounds.toggleMute(); // restore
  });

  await t.test('SmashSounds BGM controls can be invoked without throw', () => {
    assert.doesNotThrow(() => SmashSounds.startBgm());
    assert.doesNotThrow(() => SmashSounds.stopBgm());
    assert.doesNotThrow(() => SmashSounds.toggleBgm());
    SmashSounds.stopBgm();
  });
});

test('SmashOrPass: Roster Carousel Navigation & Normalization', async (t) => {
  const normalizeIndex = (idx: number, N: number): number => {
    if (N === 0) return 0;
    return ((Math.round(idx) % N) + N) % N;
  };

  const stepPrev = (current: number): number => Math.round(current) - 1;
  const stepNext = (current: number): number => Math.round(current) + 1;

  await t.test('steps left and right accurately with wrap-around normalization', () => {
    const N = 6;
    let center = 0;

    // Step Left from 0 -> -1 -> normalized to 5
    center = stepPrev(center);
    assert.strictEqual(center, -1);
    assert.strictEqual(normalizeIndex(center, N), 5);

    // Step Left again -> -2 -> normalized to 4
    center = stepPrev(center);
    assert.strictEqual(center, -2);
    assert.strictEqual(normalizeIndex(center, N), 4);

    // Step Right -> -1 -> normalized to 5
    center = stepNext(center);
    assert.strictEqual(center, -1);
    assert.strictEqual(normalizeIndex(center, N), 5);

    // Step Right -> 0 -> normalized to 0
    center = stepNext(center);
    assert.strictEqual(center, 0);
    assert.strictEqual(normalizeIndex(center, N), 0);

    // Step Right -> 1 -> normalized to 1
    center = stepNext(center);
    assert.strictEqual(center, 1);
    assert.strictEqual(normalizeIndex(center, N), 1);
  });

  await t.test('rounds fractional drag positions before stepping', () => {
    assert.strictEqual(stepPrev(1.4), 0);
    assert.strictEqual(stepNext(1.4), 2);
    assert.strictEqual(stepPrev(-0.8), -2);
    assert.strictEqual(stepNext(-0.8), 0);
  });

  await t.test('calculates continuous shortest signed angular differences in 3D modulo ring', () => {
    const N = 6;
    const calcDiff = (i: number, visualIndex: number) => {
      return ((i - visualIndex) % N + N * 1.5) % N - (N / 2);
    };

    // When visualIndex is 0:
    assert.strictEqual(calcDiff(0, 0), 0);
    assert.strictEqual(calcDiff(1, 0), 1);
    assert.strictEqual(calcDiff(2, 0), 2);
    assert.strictEqual(calcDiff(5, 0), -1);
    assert.strictEqual(calcDiff(4, 0), -2);

    // When visualIndex is continuously interpolating 0.5:
    assert.strictEqual(calcDiff(0, 0.5), -0.5);
    assert.strictEqual(calcDiff(1, 0.5), 0.5);
    assert.strictEqual(calcDiff(5, 0.5), -1.5);
  });
});
