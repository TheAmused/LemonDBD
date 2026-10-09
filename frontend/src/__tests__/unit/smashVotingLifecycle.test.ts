// frontend/src/__tests__/unit/smashVotingLifecycle.test.ts
import test from 'node:test';
import assert from 'node:assert';

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
