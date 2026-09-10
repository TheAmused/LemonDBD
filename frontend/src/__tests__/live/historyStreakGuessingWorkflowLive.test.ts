// frontend/src/__tests__/live/historyStreakGuessingWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: History Streak Guessing Game", async () => {
  const username = `hist_fe_${Date.now()}`;
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

  let runRes = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=medium`, { headers });
  if (runRes.status !== 200) {
    // Retry briefly if concurrent killswitch test temporarily disabled the mode
    for (let attempt = 0; attempt < 8 && runRes.status !== 200; attempt++) {
      await new Promise((r) => setTimeout(r, 400));
      runRes = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=medium`, { headers });
    }
  }
  if (runRes.status !== 200) {
    const errText = await runRes.text();
    assert.fail(`History streak returned status ${runRes.status}: ${errText}`);
  }
  assert.strictEqual(runRes.status, 200);
});
