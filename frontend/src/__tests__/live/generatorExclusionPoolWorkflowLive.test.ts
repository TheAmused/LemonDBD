// frontend/src/__tests__/live/generatorExclusionPoolWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Generator History & Exclusion Pools", async () => {
  const drawRes = await fetch(`${API_BASE}/api/v1/generator/draw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "Killer",
      perks: ["Hex: Ruin", "Pop Goes The Weasel", "Barbecue & Chilli"],
    }),
  });
  assert.strictEqual(drawRes.status, 200);

  const getRes = await fetch(`${API_BASE}/api/v1/generator/drawn?role=Killer`);
  assert.strictEqual(getRes.status, 200);
  assert.ok((await getRes.json()).drawn_perks.length >= 3);

  const resetRes = await fetch(`${API_BASE}/api/v1/generator/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "Killer" }),
  });
  assert.strictEqual(resetRes.status, 200);
});
