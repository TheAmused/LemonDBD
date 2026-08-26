import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Game Streaks & Challenges", async () => {
  const username = `streak_fe_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: `${username}@test.com`,
      password: "Password123!",
    }),
  });
  assert.strictEqual(regRes.status, 201);
  const { token, user } = await regRes.json();
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Page Streak
  const rosterRes = await fetch(`${API_BASE}/api/v1/page-streak/roster`, {
    headers: authHeaders,
  });
  assert.strictEqual(rosterRes.status, 200);
  const rosterData = (await rosterRes.json()).data;
  assert.ok(rosterData.length > 0);

  const poolRes = await fetch(`${API_BASE}/api/v1/page-streak/pool`, {
    headers: authHeaders,
  });
  assert.strictEqual(poolRes.status, 200);
  assert.ok((await poolRes.json()).pool_size > 0);

  // 2. Chaos Streak
  const chaosRes = await fetch(`${API_BASE}/api/v1/chaos-streak/run?difficulty=easy`, {
    headers: authHeaders,
  });
  assert.strictEqual(chaosRes.status, 200);
  const chaosRun = (await chaosRes.json()).run;
  assert.ok(chaosRun.id);

  // 3. Gauntlet Streak
  const gauntletRes = await fetch(`${API_BASE}/api/v1/gauntlet-streak/run?role=killer`, {
    headers: authHeaders,
  });
  assert.strictEqual(gauntletRes.status, 200);
  const gauntletRun = (await gauntletRes.json()).run;
  assert.ok(gauntletRun.id);
});
