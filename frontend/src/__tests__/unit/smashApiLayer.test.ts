// frontend/src/__tests__/unit/smashApiLayer.test.ts
import test from 'node:test';
import assert from 'node:assert';

test('SmashOrPass: API Service Layer & Types', async (t) => {
  const {
    getSessionId,
    fetchRosters,
    fetchRosterFeed,
    castVote,
    fetchLeaderboard,
    resetSessionVotes,
    resetUserVotes,
    fetchUserVotes,
    syncSessionVotes,
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
        name: 'Dead by Daylight: Fog Canon',
        description: 'Official 98 Characters',
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
          metadata: {
            archetype: 'The Femme Fatale Agent',
            bio: 'A spy who never lets the mission slip.',
            tagline: 'Trust is a currency she never spends.',
            quote: '"I always get what I came for."',
            meme: 'she_could_step_on_me.gif',
            turn_on: 'Confidence under pressure',
            dealbreaker: 'Talking during a stealth section',
            dating_vibe: 'Dangerous, deliberate, distant',
            red_flags: ['Keeps secrets for a living'],
            green_flags: ['Never panics', 'Excellent aim'],
            chaos_score: 75,
            danger_level: 'Moderate',
            // Only the fields that differ from English are present per locale.
            translations: { pl: { quote: '„Zawsze dostaję to, po co przyszłam.”' } },
          },
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

  await t.test('fetchUserVotes retrieves user vote history from backend', async () => {
    const originalFetch = globalThis.fetch;
    const mockUserVotes = [
      { character_slug: 'ada_wong', vote_type: 'smash' },
      { character_slug: 'the_trapper', vote_type: 'pass' },
    ];
    globalThis.fetch = async (url: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/user-votes'));
      assert.ok(String(url).includes('edition=canon'));
      return {
        ok: true,
        json: async () => ({ data: mockUserVotes, count: 2 }),
      } as any;
    };

    try {
      const votes = await fetchUserVotes('canon');
      assert.strictEqual(votes.length, 2);
      assert.strictEqual(votes[0].character_slug, 'ada_wong');
      assert.strictEqual(votes[0].vote_type, 'smash');
      assert.strictEqual(votes[1].vote_type, 'pass');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('syncSessionVotes sends session_id to backend for migration', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any, opts: any) => {
      assert.ok(String(url).includes('/api/v1/smash-or-pass/sync-session'));
      assert.strictEqual(opts.method, 'POST');
      const body = JSON.parse(opts.body);
      assert.ok(body.session_id);
      assert.strictEqual(body.roster_slug, 'canon');
      return {
        ok: true,
        json: async () => ({ data: { status: 'success', synced_count: 30 } }),
      } as any;
    };

    try {
      const result = await syncSessionVotes('canon');
      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.synced_count, 30);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
