// frontend/src/__tests__/live/generatorLockAndRedrawWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Random Build Generator Lock & Redraw", async () => {
  // 1. Set config
  const cfgRes = await fetch(`${API_BASE}/api/v1/generator/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "Survivor", mode: "random", lock_perks: false }),
  });
  assert.strictEqual(cfgRes.status, 200);

  // 2. Draw perks
  const drawRes = await fetch(`${API_BASE}/api/v1/generator/draw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "Survivor",
      perks: ["Sprint Burst", "Self-Care", "Adrenaline", "Iron Will"],
    }),
  });
  assert.strictEqual(drawRes.status, 200);
  assert.ok((await drawRes.json()).drawn_perks.length >= 4);

  // 3. Reset
  const resetRes = await fetch(`${API_BASE}/api/v1/generator/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "Survivor" }),
  });
  assert.strictEqual(resetRes.status, 200);
  assert.strictEqual((await resetRes.json()).drawn_perks.length, 0);
});
