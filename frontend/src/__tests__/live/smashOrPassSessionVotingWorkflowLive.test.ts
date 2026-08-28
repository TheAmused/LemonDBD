// frontend/src/__tests__/live/smashOrPassSessionVotingWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Smash or Pass Multi-Roster Session Voting", async () => {
  const sessionId = `fe_sess_${Date.now()}`;
  const rostersRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters`);
  assert.strictEqual(rostersRes.status, 200);
  const rosters = (await rostersRes.json()).data;
  assert.ok(rosters.length > 0);
  const slug = rosters[0].slug;

  const feedRes = await fetch(
    `${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/feed?session_id=${sessionId}&limit=5`
  );
  assert.strictEqual(feedRes.status, 200);
  const entities = (await feedRes.json()).data.entities;
  assert.ok(entities.length > 0);

  const voteRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      entity_id: entities[0].id,
      vote_type: "smash",
      roster_slug: slug,
    }),
  });
  assert.strictEqual(voteRes.status, 200);

  const lbRes = await fetch(`${API_BASE}/api/v1/smash-or-pass/rosters/${slug}/leaderboard`);
  assert.strictEqual(lbRes.status, 200);
});
