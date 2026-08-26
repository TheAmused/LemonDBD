import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Smash or Pass Multi-Roster Tournament", async () => {
  // 1. Get active rosters
  const rostersRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters`);
  assert.strictEqual(rostersRes.status, 200);
  const rosters = (await rostersRes.json()).data;
  assert.ok(rosters.length > 0);

  const slug = rosters[0].slug;
  const sessionHeaders = { "X-Session-ID": `fe-session-${Date.now()}` };

  // 2. Get unvoted feed
  const feedRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/feed`, {
    headers: sessionHeaders,
  });
  assert.strictEqual(feedRes.status, 200);
  const feed = (await feedRes.json()).data;
  const entities = feed.entities || [];

  if (entities.length > 0) {
    const candidate = entities[0];
    // 3. Cast vote
    const voteRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sessionHeaders },
      body: JSON.stringify({
        entity_id: candidate.id,
        vote: "smash",
        roster_slug: slug,
      }),
    });
    assert.strictEqual(voteRes.status, 200);
  }

  // 4. Leaderboard
  const leadRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/leaderboard`);
  assert.strictEqual(leadRes.status, 200);
  const leadData = (await leadRes.json()).data;
  assert.ok(Array.isArray(leadData));
});
