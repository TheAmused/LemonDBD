import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Gauntlet Streak Multi-Round Boss Run", async () => {
  const username = `gaunt_fe_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email: `${username}@test.com`, password: "Password123!" }),
  });
  assert.strictEqual(regRes.status, 201);
  const headers = {
    Authorization: `Bearer ${(await regRes.json()).token}`,
    "Content-Type": "application/json",
  };

  const runRes = await fetch(`${API_BASE}/api/v1/gauntlet-streak/run?role=killer`, { headers });
  assert.strictEqual(runRes.status, 200);
  const run = (await runRes.json()).run;

  const statsRes = await fetch(`${API_BASE}/api/v1/gauntlet-streak/stats?role=killer`, { headers });
  assert.strictEqual(statsRes.status, 200);
});
