import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Character Powers, Addons & Equipment", async () => {
  let trapperRes = await fetch(`${API_BASE}/api/v1/characters/The_Trapper/detail`);
  if (trapperRes.status === 404) {
    trapperRes = await fetch(`${API_BASE}/api/v1/characters/The%20Trapper/detail`);
  }
  assert.strictEqual(trapperRes.status, 200);
  const trapper = (await trapperRes.json()).data;
  assert.strictEqual(trapper.character.name, "The Trapper");
  assert.ok(trapper.addons.length > 0);

  const itemsRes = await fetch(`${API_BASE}/api/v1/items?category=Toolbox`);
  assert.strictEqual(itemsRes.status, 200);
});
