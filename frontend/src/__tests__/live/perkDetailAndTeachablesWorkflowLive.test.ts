import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Perk Details, Teachables & Synergies", async () => {
  let megRes = await fetch(`${API_BASE}/api/v1/characters/Meg_Thomas/detail`);
  if (megRes.status === 404) {
    megRes = await fetch(`${API_BASE}/api/v1/characters/Meg%20Thomas/detail`);
  }
  assert.strictEqual(megRes.status, 200);
  const megData = (await megRes.json()).data;
  assert.strictEqual(megData.character.name, "Meg Thomas");
  assert.strictEqual(megData.perks.length, 3);
});
