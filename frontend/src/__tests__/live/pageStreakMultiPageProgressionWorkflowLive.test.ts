import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Page Streak Multi-Page Lifecycle", async () => {
  const username = `page_fe_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email: `${username}@test.com`, password: "Password123!" }),
  });
  assert.strictEqual(regRes.status, 201);
  const token = (await regRes.json()).token;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const rosterRes = await fetch(`${API_BASE}/api/v1/page-streak/roster`, { headers });
  assert.strictEqual(rosterRes.status, 200);
  const roster = (await rosterRes.json()).data;
  assert.ok(roster.length > 0);
  const killer = roster[0].killer || "The_Trapper";

  const startRes = await fetch(`${API_BASE}/api/v1/page-streak/run/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ killer }),
  });
  assert.ok(startRes.status === 200 || startRes.status === 201);

  const runRes = await fetch(`${API_BASE}/api/v1/page-streak/run?killer=${killer}`, { headers });
  assert.strictEqual(runRes.status, 200);
});
