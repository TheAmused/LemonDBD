// frontend/src/__tests__/live/challengesAndStreaksWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Challenges, Streaks & Killswitch Governance", async () => {
  const username = `challenger_fe_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email: `${username}@test.com`, password: "Password123!" }),
  });
  assert.strictEqual(regRes.status, 201);
  const playerHeaders = {
    Authorization: `Bearer ${(await regRes.json()).token}`,
    "Content-Type": "application/json",
  };

  // 1. Page streak roster & pool
  const rosterRes = await fetch(`${API_BASE}/api/v1/page-streak/roster`, { headers: playerHeaders });
  assert.strictEqual(rosterRes.status, 200);
  const roster = (await rosterRes.json()).data;
  assert.ok(roster.length > 0);

  const killerName = roster[0].killer || "The_Trapper";
  const runRes = await fetch(`${API_BASE}/api/v1/page-streak/run?killer=${killerName}`, {
    headers: playerHeaders,
  });
  assert.strictEqual(runRes.status, 200);

  // 2. Gauntlet streak run
  const gauntletRes = await fetch(`${API_BASE}/api/v1/gauntlet-streak/run?role=killer`, {
    headers: playerHeaders,
  });
  assert.strictEqual(gauntletRes.status, 200);
  const gRun = (await gauntletRes.json()).run;
  assert.ok(gRun.id);

  // 3. Admin login & killswitch toggle
  const adminLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "lemon", password: "lemon" }),
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const adminHeaders = {
    Authorization: `Bearer ${(await adminLoginRes.json()).token}`,
    "Content-Type": "application/json",
  };

  // Disable history mode
  const disRes = await fetch(`${API_BASE}/api/v1/admin/challenge-modes/history`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ is_enabled: false, reason: "Frontend Test Maintenance" }),
  });
  assert.strictEqual(disRes.status, 200);

  // Create new user -> attempt history run -> should receive 400 blocked
  const user2Name = `blocked_fe_${Date.now()}`;
  const reg2Res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user2Name, email: `${user2Name}@test.com`, password: "Password123!" }),
  });
  assert.strictEqual(reg2Res.status, 201);
  const user2Headers = {
    Authorization: `Bearer ${(await reg2Res.json()).token}`,
    "Content-Type": "application/json",
  };

  const blockedRes = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=hell`, {
    headers: user2Headers,
  });
  assert.strictEqual(blockedRes.status, 400);

  // Re-enable history mode
  const enRes = await fetch(`${API_BASE}/api/v1/admin/challenge-modes/history`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ is_enabled: true }),
  });
  assert.strictEqual(enRes.status, 200);

  // User can now start history run
  const okRes = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=hell`, {
    headers: user2Headers,
  });
  assert.strictEqual(okRes.status, 200);
});
