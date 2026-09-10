// frontend/src/__tests__/live/smashOrPassLive.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeArchetypeShare,
  decodeArchetypeShare,
  buildArchetypeShareUrl,
  calculateRomancePersona,
  type VoteRecord,
} from '../../utils/smashPersona';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1';

// ─────────────────────────────────────────────────────────────
// Helper: Cast N votes against the first roster
// ─────────────────────────────────────────────────────────────
async function castVotesForSession(
  n: number,
  voteType: 'smash' | 'pass' | 'super_smash' = 'smash'
): Promise<{ sessionId: string; votedEntities: any[]; slug: string }> {
  const sessionId = `live-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sessionHeaders = {
    'X-Session-ID': sessionId,
    'Content-Type': 'application/json',
  };

  // 1. Fetch rosters
  const rostersRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters`);
  assert.strictEqual(rostersRes.status, 200);
  const rosters = (await rostersRes.json()).data;
  assert.ok(rosters.length > 0, 'Must have at least one active roster');
  const slug = rosters[0].slug;

  // 2. Fetch unvoted feed
  const feedRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/feed`, {
    headers: { 'X-Session-ID': sessionId },
  });
  assert.strictEqual(feedRes.status, 200);
  const feedData = (await feedRes.json()).data;
  const entities: any[] = feedData.entities || [];
  assert.ok(entities.length >= n, `Need at least ${n} candidates in the feed to cast votes`);

  // 3. Cast votes
  const votedEntities: any[] = [];
  for (let i = 0; i < n; i++) {
    const entity = entities[i];
    const voteRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/vote`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({
        entity_id: entity.id,
        vote: voteType,
        roster_slug: slug,
      }),
    });
    assert.strictEqual(voteRes.status, 200, `Vote ${i + 1} should return 200`);
    votedEntities.push(entity);
  }

  return { sessionId, votedEntities, slug };
}

// ─────────────────────────────────────────────────────────────
// LIVE TEST 1: Multi-Roster Tournament Flow
// ─────────────────────────────────────────────────────────────
test('Live: Smash or Pass – Multi-Roster Tournament (Rosters, Feed, Vote, Leaderboard)', async () => {
  const rostersRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters`);
  assert.strictEqual(rostersRes.status, 200);
  const rosters = (await rostersRes.json()).data;
  assert.ok(rosters.length > 0, 'At least one active roster must exist');

  const slug = rosters[0].slug;
  const sessionId = `live-multi-${Date.now()}`;
  const sessionHeaders = { 'X-Session-ID': sessionId };

  const feedRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/feed`, {
    headers: sessionHeaders,
  });
  assert.strictEqual(feedRes.status, 200);
  const entities = (await feedRes.json()).data.entities || [];

  if (entities.length > 0) {
    const voteRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sessionHeaders },
      body: JSON.stringify({ entity_id: entities[0].id, vote: 'smash', roster_slug: slug }),
    });
    assert.strictEqual(voteRes.status, 200);
  }

  const leadRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/leaderboard`);
  assert.strictEqual(leadRes.status, 200);
  const leadData = (await leadRes.json()).data;
  assert.ok(Array.isArray(leadData));
});

// ─────────────────────────────────────────────────────────────
// LIVE TEST 2: Archetype Calculation from Real Feed Entities
// ─────────────────────────────────────────────────────────────
test('Live: Archetype is calculated correctly from real cast votes', async () => {
  const { votedEntities } = await castVotesForSession(5, 'smash');

  const voteHistory: VoteRecord[] = votedEntities.map((e, i) => ({
    character: e,
    vote: 'smash',
    timestamp: Date.now() + i,
  }));

  const persona = calculateRomancePersona(voteHistory, {});
  assert.strictEqual(persona.totalVotes, 5);
  assert.strictEqual(persona.smashRate, 100);
  assert.ok(
    persona.archKey === 'entitysParamour' || persona.archKey !== 'untappedSoul',
    `Expected non-empty archetype, got: ${persona.archKey}`
  );
  assert.ok(persona.favoriteChar, 'favoriteChar should be the first smashed entity');
});

// ─────────────────────────────────────────────────────────────
// LIVE TEST 3: Archetype Share URL – Encode, Decode, Validate
// ─────────────────────────────────────────────────────────────
test('Live: Archetype deep-link encoding and decoding produces valid shareable URL', async () => {
  const { votedEntities } = await castVotesForSession(4, 'smash');

  const voteHistory: VoteRecord[] = votedEntities.map((e, i) => ({
    character: e,
    vote: 'smash',
    timestamp: Date.now() + i,
  }));

  const persona = calculateRomancePersona(voteHistory, {});
  const payload = {
    k: persona.archKey,
    r: persona.smashRate,
    s: persona.survivorAffinity,
    ka: persona.killerAffinity,
    v: persona.totalVotes,
    fn: persona.favoriteChar?.name,
    fs: persona.favoriteChar?.slug,
    fr: persona.favoriteChar?.role,
  };

  const shareUrl = buildArchetypeShareUrl(`${API_BASE}/en/smash-or-pass`, payload);

  // The URL must contain a shared_archetype query param
  const parsed = new URL(shareUrl);
  const param = parsed.searchParams.get('shared_archetype');
  assert.ok(param && param.length > 0, 'shared_archetype query param must be present');

  // The param must decode back cleanly
  const decoded = decodeArchetypeShare(param);
  assert.ok(decoded !== null, 'Decoded payload must not be null');
  assert.strictEqual(decoded.k, persona.archKey);
  assert.strictEqual(decoded.r, persona.smashRate);
  assert.strictEqual(decoded.v, persona.totalVotes);

  // Verify the encoded param is a valid URL-safe string
  assert.ok(!/[^A-Za-z0-9%._~\-]/.test(param), 'Encoded param should be URL-safe');
});

// ─────────────────────────────────────────────────────────────
// LIVE TEST 4: Recipient Opens Shared Archetype Link
//   Simulates another user arriving at the shared URL – tests that
//   decodeArchetypeShare extracts the full persona that the sender shared.
// ─────────────────────────────────────────────────────────────
test('Live: Recipient can decode shared archetype from URL and reconstruct full persona', async () => {
  // Sender: cast real votes and build their archetype
  const { votedEntities } = await castVotesForSession(6, 'smash');
  const senderVotes: VoteRecord[] = votedEntities.map((e, i) => ({
    character: e,
    vote: 'smash',
    timestamp: Date.now() + i,
  }));
  const senderPersona = calculateRomancePersona(senderVotes, {});

  const shareUrl = buildArchetypeShareUrl(`${API_BASE}/en/smash-or-pass`, {
    k: senderPersona.archKey,
    r: senderPersona.smashRate,
    s: senderPersona.survivorAffinity,
    ka: senderPersona.killerAffinity,
    v: senderPersona.totalVotes,
    fn: senderPersona.favoriteChar?.name,
  });

  // Recipient: extract the shared_archetype param from the URL
  const parsedUrl = new URL(shareUrl);
  const encodedParam = parsedUrl.searchParams.get('shared_archetype');
  assert.ok(encodedParam, 'URL must contain shared_archetype param');

  const recipientDecoded = decodeArchetypeShare(encodedParam);
  assert.ok(recipientDecoded, 'Recipient must be able to decode the shared payload');
  assert.strictEqual(recipientDecoded.k, senderPersona.archKey, 'Archetype key must match');
  assert.strictEqual(recipientDecoded.r, senderPersona.smashRate, 'Smash rate must match');
  assert.strictEqual(recipientDecoded.s, senderPersona.survivorAffinity, 'Survivor affinity must match');
  assert.strictEqual(recipientDecoded.ka, senderPersona.killerAffinity, 'Killer affinity must match');
  assert.strictEqual(recipientDecoded.v, senderPersona.totalVotes, 'Total votes must match');
  if (senderPersona.favoriteChar) {
    assert.strictEqual(recipientDecoded.fn, senderPersona.favoriteChar.name, 'Favorite char name must match');
  }
});

// ─────────────────────────────────────────────────────────────
// LIVE TEST 5: Shared URL is stable across re-encoding
// ─────────────────────────────────────────────────────────────
test('Live: Encoding the same archetype payload twice produces identical URLs', async () => {
  const payload = {
    k: 'redStainAddict',
    r: 80,
    s: 20,
    ka: 80,
    v: 15,
    fn: 'The Trapper',
    fs: 'trapper',
    fr: 'Killer',
  };

  const url1 = buildArchetypeShareUrl(`${API_BASE}/en/smash-or-pass`, payload);
  const url2 = buildArchetypeShareUrl(`${API_BASE}/en/smash-or-pass`, payload);

  assert.strictEqual(url1, url2, 'Same payload must always produce the same shareable URL');

  const decoded1 = decodeArchetypeShare(new URL(url1).searchParams.get('shared_archetype')!);
  const decoded2 = decodeArchetypeShare(new URL(url2).searchParams.get('shared_archetype')!);

  assert.deepStrictEqual(decoded1, decoded2, 'Decoded results must be identical');
});

// ─────────────────────────────────────────────────────────────
// LIVE TEST 6: Leaderboard stats are correct after vote casting
// ─────────────────────────────────────────────────────────────
test('Live: Leaderboard returns updated stats after casting votes', async () => {
  const { slug, votedEntities } = await castVotesForSession(2, 'smash');

  const leadRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/leaderboard`);
  assert.strictEqual(leadRes.status, 200);
  const leadData = (await leadRes.json()).data;

  assert.ok(Array.isArray(leadData), 'Leaderboard data must be an array');
  assert.ok(leadData.length > 0, 'Leaderboard must have entries after voting');

  // Each entry must have required stat fields
  const entry = leadData[0];
  assert.ok(typeof entry.smash_rate === 'number', 'smash_rate must be a number');
  assert.ok(typeof entry.total_votes === 'number', 'total_votes must be a number');
});
