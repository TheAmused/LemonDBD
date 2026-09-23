// frontend/src/__tests__/unit/smashOrPass.test.ts
// frontend/src/utils/__tests__/smashOrPass.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { SmashSounds } from '@/utils/../components/smash-or-pass/SmashSoundEffects';
import { localizedProfile } from '../../utils/entityProfile';
import type { EntityMetadata, EntityItem, RosterItem } from '../../types/smashOrPass';
import {
  cleanWatermark,
  getWatermarkFontSize,
  sampleFlags,
  resolveWatermarks,
} from '../../utils/smashWatermarks';

test('SmashOrPass: Types & Roster/Entity Contracts', async (t) => {
  await t.test('RosterItem uses direct name and description without name_i18n_key', () => {
    const roster: RosterItem = {
      id: 'canon',
      slug: 'canon',
      name: 'Dead by Daylight: Fog Canon',
      description: 'Official 98 Characters',
      theme_color: '#ff0055',
      category: 'DBD Canon',
      is_nsfw: false,
      is_active: true,
      entity_count: 98,
    };
    assert.strictEqual(roster.name, 'Dead by Daylight: Fog Canon');
    assert.strictEqual(roster.description, 'Official 98 Characters');
    assert.strictEqual('name_i18n_key' in roster, false);
    assert.strictEqual('description_i18n_key' in roster, false);
  });

  await t.test('EntityItem supports dual-identity watermarks and real_name', () => {
    const entity: EntityItem = {
      id: 'e-onryo',
      roster_id: 'canon',
      slug: 'the_onryo',
      name: 'The Onryō',
      real_name: 'Sadako Yamamura',
      watermark_left: 'THE ONRYŌ',
      watermark_right: 'SADAKO',
      role: 'Killer',
      gender: 'female',
    };
    assert.strictEqual(entity.real_name, 'Sadako Yamamura');
    assert.strictEqual(entity.watermark_left, 'THE ONRYŌ');
    assert.strictEqual(entity.watermark_right, 'SADAKO');
  });
});

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

test('SmashOrPass: Localized Profile Resolution', async (t) => {
  const meta: EntityMetadata = {
    archetype: 'The Brooding Beach Jock',
    bio: 'Sun, sand, and unresolved issues.',
    tagline: 'He will carry you off the beach. Eventually.',
    quote: '"Plants do not judge."',
    meme: 'brooding_jock.gif',
    turn_on: 'Someone who can keep up',
    dealbreaker: 'Sunscreen refusers',
    dating_vibe: 'Warm outside, storm inside',
    red_flags: ['Emotionally unavailable before noon'],
    green_flags: ['Loyal', 'Strong swimmer'],
    // A locale only carries the fields that actually DIFFER from English.
    translations: {
      pl: { quote: '„Rośliny cię nie oceniają.”', red_flags: ['Niedostępny emocjonalnie'] },
    },
  };

  await t.test('returns the English profile verbatim for en', () => {
    const profile = localizedProfile(meta, 'en');
    assert.strictEqual(profile.quote, '"Plants do not judge."');
    assert.deepStrictEqual(profile.green_flags, ['Loyal', 'Strong swimmer']);
  });

  await t.test('overlays only the fields the locale actually overrides', () => {
    const profile = localizedProfile(meta, 'pl');
    assert.strictEqual(profile.quote, '„Rośliny cię nie oceniają.”');
    assert.deepStrictEqual(profile.red_flags, ['Niedostępny emocjonalnie']);
    // Absent in translations.pl, so it falls back to English — the only fallback left.
    assert.strictEqual(profile.bio, 'Sun, sand, and unresolved issues.');
    assert.deepStrictEqual(profile.green_flags, ['Loyal', 'Strong swimmer']);
  });

  await t.test('falls back to English for a locale with no overrides at all', () => {
    const profile = localizedProfile(meta, 'ja');
    assert.strictEqual(profile.quote, '"Plants do not judge."');
    assert.strictEqual(profile.archetype, 'The Brooding Beach Jock');
  });

  await t.test('returns a fully populated profile for missing metadata', () => {
    const profile = localizedProfile(undefined, 'de');
    assert.strictEqual(profile.bio, '');
    assert.deepStrictEqual(profile.red_flags, []);
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

test('SmashOrPass: Sound Effects & Web Audio Synthesizer', async (t) => {
  await t.test('SmashSounds methods can be invoked safely in test environment', () => {
    assert.doesNotThrow(() => SmashSounds.playSmashSound());
    assert.doesNotThrow(() => SmashSounds.playPassSound());
    assert.doesNotThrow(() => SmashSounds.playFlipSound());
    assert.doesNotThrow(() => SmashSounds.playHeartbeat(1.0));
    assert.doesNotThrow(() => SmashSounds.playHoverTick());
    assert.doesNotThrow(() => SmashSounds.playSensualHover());
    assert.doesNotThrow(() => SmashSounds.playSadHover());
    assert.doesNotThrow(() => SmashSounds.playCardGrabSound());
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

test('SmashOrPass: Voting, Stats, Reset, and Revote Complete Lifecycle', async (t) => {
  const {
    fetchRosterFeed,
    castVote,
    fetchLeaderboard,
    resetUserVotes,
    resetSessionVotes,
    fetchUserVotes,
    syncSessionVotes,
  } = await import('../../services/smashApi');

  await t.test('full cycle: vote -> stats check -> reset -> stats check -> revote with flipped choices', async () => {
    const originalFetch = globalThis.fetch;

    // Simulated backend state
    type VoteRecord = { entityId: string; slug: string; voteType: 'smash' | 'pass' | 'super_smash' };
    let dbVotes: VoteRecord[] = [];
    const totalRosterCount = 98;

    const characters = [
      { id: 'e-1', slug: 'ada_wong', name: 'Ada Wong', role: 'Survivor' },
      { id: 'e-2', slug: 'the_trapper', name: 'The Trapper', role: 'Killer' },
      { id: 'e-3', slug: 'sable_ward', name: 'Sable Ward', role: 'Survivor' },
    ];

    const getStats = (entityId: string) => {
      const votes = dbVotes.filter((v) => v.entityId === entityId);
      const smashCount = votes.filter((v) => v.voteType === 'smash').length;
      const passCount = votes.filter((v) => v.voteType === 'pass').length;
      const superSmashCount = votes.filter((v) => v.voteType === 'super_smash').length;
      const total = votes.length;
      const smashRate = total > 0 ? Math.round(((smashCount + superSmashCount) / total) * 1000) / 10 : 0;
      let tier = 'Eldritch Void';
      if (smashRate >= 80) tier = 'God Tier';
      else if (smashRate >= 60) tier = 'Fatal Attraction';
      else if (smashRate >= 40) tier = 'Friendzone';
      return { smashCount, passCount, superSmashCount, total, smashRate, tier };
    };

    globalThis.fetch = async (url: any, opts: any = {}) => {
      const urlStr = String(url);
      const method = (opts.method || 'GET').toUpperCase();

      // Feed endpoint
      if (urlStr.includes('/api/v1/smash-or-pass/rosters/canon/feed')) {
        const votedIds = new Set(dbVotes.map((v) => v.entityId));
        const remainingEntities = characters.filter((c) => !votedIds.has(c.id));
        return {
          ok: true,
          json: async () => ({
            data: {
              roster: { id: 'r-1', slug: 'canon' },
              entities: remainingEntities,
              total_remaining: totalRosterCount - votedIds.size,
            },
          }),
        } as any;
      }

      // Cast vote endpoint
      if (urlStr.includes('/api/v1/smash-or-pass/vote') && method === 'POST') {
        const body = JSON.parse(opts.body);
        dbVotes.push({
          entityId: body.entity_id,
          slug: body.character_slug,
          voteType: body.vote_type,
        });
        const stat = getStats(body.entity_id);
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              id: body.entity_id,
              slug: body.character_slug,
              smash_count: stat.smashCount,
              pass_count: stat.passCount,
              super_smash_count: stat.superSmashCount,
              total_votes: stat.total,
              smash_rate: stat.smashRate,
            },
          }),
        } as any;
      }

      // Leaderboard endpoint
      if (urlStr.includes('/api/v1/smash-or-pass/rosters/canon/leaderboard')) {
        const leaderboard = characters.map((c) => {
          const stat = getStats(c.id);
          return {
            id: c.id,
            slug: c.slug,
            name: c.name,
            role: c.role,
            total_votes: stat.total,
            smash_count: stat.smashCount,
            pass_count: stat.passCount,
            smash_rate: stat.smashRate,
            tier: stat.tier,
          };
        }).sort((a, b) => b.smash_rate - a.smash_rate);

        return {
          ok: true,
          json: async () => ({ data: leaderboard, count: leaderboard.length }),
        } as any;
      }

      // Reset user votes endpoint
      if (urlStr.includes('/api/v1/smash-or-pass/user-votes/reset') && method === 'POST') {
        const count = dbVotes.length;
        dbVotes = [];
        return {
          ok: true,
          json: async () => ({ status: 'success', data: { status: 'success', reset_count: count }, reset_count: count }),
        } as any;
      }

      // User votes history endpoint
      if (urlStr.includes('/api/v1/smash-or-pass/user-votes') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            data: dbVotes.map((v) => ({ character_slug: v.slug, vote_type: v.voteType })),
            count: dbVotes.length,
          }),
        } as any;
      }

      return { ok: false, status: 404 } as any;
    };

    try {
      // Step 1: Initial state check
      const initialFeed = await fetchRosterFeed('canon');
      assert.strictEqual(initialFeed.total_remaining, 98, 'Initial feed should have all 98 characters');
      const initialVotes = await fetchUserVotes('canon');
      assert.strictEqual(initialVotes.length, 0, 'Initial user vote history should be empty');
      const initialLb = await fetchLeaderboard('canon');
      for (const entry of initialLb) {
        assert.strictEqual(entry.total_votes, 0, 'Initial votes for each entry should be 0');
        assert.strictEqual(entry.smash_rate, 0, 'Initial rate for each entry should be 0%');
      }

      // Step 2: User casts votes
      // Ada Wong -> smash
      const v1 = await castVote('e-1', 'smash', 'ada_wong');
      assert.strictEqual(v1.data.smash_count, 1);
      assert.strictEqual(v1.data.pass_count, 0);
      assert.strictEqual(v1.data.total_votes, 1);
      assert.strictEqual(v1.data.smash_rate, 100);

      // The Trapper -> pass
      const v2 = await castVote('e-2', 'pass', 'the_trapper');
      assert.strictEqual(v2.data.smash_count, 0);
      assert.strictEqual(v2.data.pass_count, 1);
      assert.strictEqual(v2.data.total_votes, 1);
      assert.strictEqual(v2.data.smash_rate, 0);

      // Sable Ward -> super_smash
      const v3 = await castVote('e-3', 'super_smash', 'sable_ward');
      assert.strictEqual(v3.data.super_smash_count, 1);
      assert.strictEqual(v3.data.total_votes, 1);
      assert.strictEqual(v3.data.smash_rate, 100);

      // Step 3: Check stats post-voting
      const postVoteFeed = await fetchRosterFeed('canon');
      assert.strictEqual(postVoteFeed.total_remaining, 95, 'Feed remaining should decrease by 3');
      assert.strictEqual(postVoteFeed.entities.length, 0, 'All 3 mock characters should be filtered out of feed');

      const postVoteHistory = await fetchUserVotes('canon');
      assert.strictEqual(postVoteHistory.length, 3);
      assert.deepStrictEqual(
        postVoteHistory.map((h: any) => ({ slug: h.character_slug, vote: h.vote_type })),
        [
          { slug: 'ada_wong', vote: 'smash' },
          { slug: 'the_trapper', vote: 'pass' },
          { slug: 'sable_ward', vote: 'super_smash' },
        ]
      );

      const postVoteLb = await fetchLeaderboard('canon');
      const lbAda = postVoteLb.find((x: any) => x.slug === 'ada_wong')!;
      const lbTrapper = postVoteLb.find((x: any) => x.slug === 'the_trapper')!;
      const lbSable = postVoteLb.find((x: any) => x.slug === 'sable_ward')!;

      assert.strictEqual(lbAda.smash_rate, 100);
      assert.strictEqual(lbAda.tier, 'God Tier');
      assert.strictEqual(lbSable.smash_rate, 100);
      assert.strictEqual(lbSable.tier, 'God Tier');
      assert.strictEqual(lbTrapper.smash_rate, 0);
      assert.strictEqual(lbTrapper.tier, 'Eldritch Void');

      // Step 4: Reset votes
      const resetRes = await resetUserVotes('canon');
      assert.strictEqual(resetRes.status, 'success');
      assert.strictEqual(resetRes.reset_count, 3, 'Reset count should equal the 3 cast votes');

      // Check idempotency of reset
      const resetAgain = await resetUserVotes('canon');
      assert.strictEqual(resetAgain.reset_count, 0, 'Subsequent reset should return 0');

      // Step 5: Check stats post-reset
      const postResetVotes = await fetchUserVotes('canon');
      assert.strictEqual(postResetVotes.length, 0, 'Vote history must be completely empty after reset');

      const postResetFeed = await fetchRosterFeed('canon');
      assert.strictEqual(postResetFeed.total_remaining, 98, 'Feed remaining must be restored to full 98');
      assert.strictEqual(postResetFeed.entities.length, 3, 'All 3 characters should be available again in feed');

      const postResetLb = await fetchLeaderboard('canon');
      for (const entry of postResetLb) {
        assert.strictEqual(entry.total_votes, 0, `${entry.name} votes should be unwound to 0`);
        assert.strictEqual(entry.smash_rate, 0, `${entry.name} smash rate should be unwound to 0%`);
        assert.strictEqual(entry.tier, 'Eldritch Void', `${entry.name} tier should return to baseline`);
      }

      // Step 6: Revote with flipped choices!
      // Ada Wong: Pass
      const revoteAda = await castVote('e-1', 'pass', 'ada_wong');
      assert.strictEqual(revoteAda.data.smash_count, 0);
      assert.strictEqual(revoteAda.data.pass_count, 1);
      assert.strictEqual(revoteAda.data.total_votes, 1);
      assert.strictEqual(revoteAda.data.smash_rate, 0);

      // The Trapper: Smash
      const revoteTrapper = await castVote('e-2', 'smash', 'the_trapper');
      assert.strictEqual(revoteTrapper.data.smash_count, 1);
      assert.strictEqual(revoteTrapper.data.pass_count, 0);
      assert.strictEqual(revoteTrapper.data.total_votes, 1);
      assert.strictEqual(revoteTrapper.data.smash_rate, 100);

      // Sable Ward: Smash
      const revoteSable = await castVote('e-3', 'smash', 'sable_ward');
      assert.strictEqual(revoteSable.data.smash_count, 1);
      assert.strictEqual(revoteSable.data.pass_count, 0);
      assert.strictEqual(revoteSable.data.total_votes, 1);
      assert.strictEqual(revoteSable.data.smash_rate, 100);

      // Step 7: Check stats post-revote
      const postRevoteFeed = await fetchRosterFeed('canon');
      assert.strictEqual(postRevoteFeed.total_remaining, 95);

      const postRevoteHistory = await fetchUserVotes('canon');
      assert.strictEqual(postRevoteHistory.length, 3);
      assert.deepStrictEqual(
        postRevoteHistory.map((h: any) => ({ slug: h.character_slug, vote: h.vote_type })),
        [
          { slug: 'ada_wong', vote: 'pass' },
          { slug: 'the_trapper', vote: 'smash' },
          { slug: 'sable_ward', vote: 'smash' },
        ]
      );

      const postRevoteLb = await fetchLeaderboard('canon');
      const lbAda2 = postRevoteLb.find((x: any) => x.slug === 'ada_wong')!;
      const lbTrapper2 = postRevoteLb.find((x: any) => x.slug === 'the_trapper')!;
      const lbSable2 = postRevoteLb.find((x: any) => x.slug === 'sable_ward')!;

      // Notice the flip: Trapper is now God Tier, Ada is Eldritch Void
      assert.strictEqual(lbTrapper2.smash_rate, 100);
      assert.strictEqual(lbTrapper2.tier, 'God Tier');
      assert.strictEqual(lbSable2.smash_rate, 100);
      assert.strictEqual(lbSable2.tier, 'God Tier');
      assert.strictEqual(lbAda2.smash_rate, 0);
      assert.strictEqual(lbAda2.tier, 'Eldritch Void');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('guest session cycle: vote -> session reset -> revote -> sync to user account', async () => {
    const originalFetch = globalThis.fetch;

    let guestVotes: { entityId: string; slug: string; voteType: string }[] = [];
    let authenticatedVotes: { entityId: string; slug: string; voteType: string }[] = [];

    globalThis.fetch = async (url: any, opts: any = {}) => {
      const urlStr = String(url);
      const method = (opts.method || 'GET').toUpperCase();

      if (urlStr.includes('/api/v1/smash-or-pass/session/reset') && method === 'POST') {
        const count = guestVotes.length;
        guestVotes = [];
        return {
          ok: true,
          json: async () => ({ status: 'success', reset_count: count }),
        } as any;
      }

      if (urlStr.includes('/api/v1/smash-or-pass/vote') && method === 'POST') {
        const body = JSON.parse(opts.body);
        guestVotes.push({ entityId: body.entity_id, slug: body.character_slug, voteType: body.vote_type });
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: { id: body.entity_id, slug: body.character_slug, total_votes: 1 },
          }),
        } as any;
      }

      if (urlStr.includes('/api/v1/smash-or-pass/sync-session') && method === 'POST') {
        const count = guestVotes.length;
        authenticatedVotes = [...guestVotes];
        guestVotes = [];
        return {
          ok: true,
          json: async () => ({ data: { status: 'success', synced_count: count } }),
        } as any;
      }

      return { ok: false, status: 404 } as any;
    };

    try {
      // Guest votes 2 times
      await castVote('e-1', 'smash', 'meg_thomas');
      await castVote('e-2', 'pass', 'the_wraith');
      assert.strictEqual(guestVotes.length, 2);

      // Guest resets session
      const resetRes = await resetSessionVotes('canon');
      assert.strictEqual(resetRes.reset_count, 2);
      assert.strictEqual(guestVotes.length, 0);

      // Guest revotes with Super Smash on Meg Thomas
      await castVote('e-1', 'super_smash', 'meg_thomas');
      assert.strictEqual(guestVotes.length, 1);

      // User registers / logs in -> syncs session
      const syncRes = await syncSessionVotes('canon');
      assert.strictEqual(syncRes.status, 'success');
      assert.strictEqual(syncRes.synced_count, 1);
      assert.strictEqual(authenticatedVotes.length, 1);
      assert.strictEqual(authenticatedVotes[0].slug, 'meg_thomas');
      assert.strictEqual(authenticatedVotes[0].voteType, 'super_smash');
      assert.strictEqual(guestVotes.length, 0, 'Guest votes migrated into authenticated state');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('multi-vote stats transitions across voting, resets, and revoting', () => {
    // Pure logic tier verification simulating consecutive vote mutations on a single character
    const computeStats = (smash: number, superSmash: number, pass: number) => {
      const total = smash + superSmash + pass;
      const smashRate = total > 0 ? Math.round(((smash + superSmash) / total) * 1000) / 10 : 0;
      let tier = 'Eldritch Void';
      if (smashRate >= 80) tier = 'God Tier';
      else if (smashRate >= 60) tier = 'Fatal Attraction';
      else if (smashRate >= 40) tier = 'Friendzone';
      return { total, smashRate, tier };
    };

    // State 1: 1 Smash
    const s1 = computeStats(1, 0, 0);
    assert.strictEqual(s1.smashRate, 100);
    assert.strictEqual(s1.tier, 'God Tier');

    // State 2: 2nd user votes Pass -> 1 Smash, 1 Pass = 50%
    const s2 = computeStats(1, 0, 1);
    assert.strictEqual(s2.smashRate, 50);
    assert.strictEqual(s2.tier, 'Friendzone');

    // State 3: 3rd user votes Pass -> 1 Smash, 2 Pass = 33.3%
    const s3 = computeStats(1, 0, 2);
    assert.strictEqual(s3.smashRate, 33.3);
    assert.strictEqual(s3.tier, 'Eldritch Void');

    // State 4: User 2 resets their Pass vote -> 1 Smash, 1 Pass = 50%
    const s4 = computeStats(1, 0, 1);
    assert.strictEqual(s4.smashRate, 50);
    assert.strictEqual(s4.tier, 'Friendzone');

    // State 5: User 2 revotes Smash instead -> 2 Smash, 1 Pass = 66.7%
    const s5 = computeStats(2, 0, 1);
    assert.strictEqual(s5.smashRate, 66.7);
    assert.strictEqual(s5.tier, 'Fatal Attraction');

    // State 6: All users reset -> 0 votes = 0%
    const s6 = computeStats(0, 0, 0);
    assert.strictEqual(s6.total, 0);
    assert.strictEqual(s6.smashRate, 0);
    assert.strictEqual(s6.tier, 'Eldritch Void');
  });
});


test('SmashOrPass: Dynamic Flag Sampling Logic', async (t) => {
  await t.test('keeps all flags when pool length <= 3', () => {
    const emptyPool: string[] = [];
    assert.deepStrictEqual(sampleFlags(emptyPool), []);

    const singlePool = ['Flag 1'];
    assert.deepStrictEqual(sampleFlags(singlePool), ['Flag 1']);

    const twoPool = ['Flag 1', 'Flag 2'];
    assert.deepStrictEqual(sampleFlags(twoPool), ['Flag 1', 'Flag 2']);

    const threePool = ['Flag 1', 'Flag 2', 'Flag 3'];
    assert.deepStrictEqual(sampleFlags(threePool), ['Flag 1', 'Flag 2', 'Flag 3']);
  });

  await t.test('samples 2 to 3 items when pool length > 3', () => {
    const fivePool = ['Flag 1', 'Flag 2', 'Flag 3', 'Flag 4', 'Flag 5'];
    for (let i = 0; i < 20; i++) {
      const sampled = sampleFlags(fivePool);
      assert.ok(sampled.length === 2 || sampled.length === 3, `Sampled length ${sampled.length} should be 2 or 3`);
      for (const flag of sampled) {
        assert.ok(fivePool.includes(flag), `Sampled flag ${flag} must be from original pool`);
      }
      // Ensure all items in sample are unique
      const uniqueSet = new Set(sampled);
      assert.strictEqual(uniqueSet.size, sampled.length, 'Sampled items must be unique');
    }
  });
});

test('SmashOrPass: Dual-Identity Watermarks & Clamping Helper', async (t) => {
  await t.test('cleans parentheses and quotes from watermarks', () => {
    assert.strictEqual(cleanWatermark('The Shape ("Michael Myers")'), 'The Shape Michael Myers');
    assert.strictEqual(cleanWatermark('Sadako (Yamamura)'), 'Sadako Yamamura');
  });

  await t.test('clamps font size for long watermarks (> 10 characters)', () => {
    assert.strictEqual(getWatermarkFontSize('SHORT'), 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl');
    assert.strictEqual(getWatermarkFontSize('1234567890'), 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl');
    assert.strictEqual(getWatermarkFontSize('THE EXECUTIONER'), 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl');
    assert.strictEqual(getWatermarkFontSize('SADAKO YAMAMURA'), 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl');
  });

  await t.test('uses explicit watermark_left and watermark_right when provided', () => {
    const entity: EntityItem = {
      id: 'e-1',
      roster_id: 'r-1',
      slug: 'the_onryo',
      name: 'The Onryō',
      real_name: 'Sadako Yamamura',
      watermark_left: 'THE ONRYŌ',
      watermark_right: 'SADAKO',
      role: 'Killer',
      gender: 'female',
    };
    const { leftWatermark, rightWatermark } = resolveWatermarks(entity);
    assert.strictEqual(leftWatermark, 'THE ONRYŌ');
    assert.strictEqual(rightWatermark, 'SADAKO');
  });

  await t.test('falls back gracefully for survivor and killer without explicit watermarks', () => {
    const survivor: EntityItem = {
      id: 'e-2',
      roster_id: 'r-1',
      slug: 'dwight_fairfield',
      name: 'Dwight Fairfield',
      role: 'Survivor',
      gender: 'male',
    };
    const resSurv = resolveWatermarks(survivor);
    assert.strictEqual(resSurv.leftWatermark, 'Dwight');
    assert.strictEqual(resSurv.rightWatermark, 'Fairfield');

    const killer: EntityItem = {
      id: 'e-3',
      roster_id: 'r-1',
      slug: 'the_trapper',
      name: 'The Trapper',
      real_name: 'Evan MacMillan',
      role: 'Killer',
      gender: 'male',
    };
    const resKiller = resolveWatermarks(killer);
    assert.strictEqual(resKiller.leftWatermark, 'The Trapper');
    assert.strictEqual(resKiller.rightWatermark, 'Evan MacMillan');
  });

  await t.test('ensures neither side is ever empty', () => {
    const fallbackKiller: EntityItem = {
      id: 'e-4',
      roster_id: 'r-1',
      slug: 'unknown_killer',
      name: '',
      role: 'Killer',
      gender: 'all',
    };
    const resEmpty = resolveWatermarks(fallbackKiller);
    assert.strictEqual(resEmpty.leftWatermark, 'KILLER');
    assert.strictEqual(resEmpty.rightWatermark, 'KILLER');
  });
});
