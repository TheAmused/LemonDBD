// frontend/src/__tests__/live/chaosStreakBlindRevealWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Chaos Streak Blind Reveal", async () => {
  const username = `chaos_fe_${Date.now()}`;
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

  const runRes = await fetch(`${API_BASE}/api/v1/chaos-streak/run?difficulty=easy`, { headers });
  assert.strictEqual(runRes.status, 200);
  const run = (await runRes.json()).run;

  const revRes = await fetch(`${API_BASE}/api/v1/chaos-streak/reveal`, {
    method: "POST",
    headers,
    body: JSON.stringify({ run_id: run.id }),
  });
  assert.strictEqual(revRes.status, 200);
});
