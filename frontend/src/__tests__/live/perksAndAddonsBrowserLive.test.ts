// frontend/src/__tests__/live/perksAndAddonsBrowserLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Character Catalog, Addons & Generator Integration", async () => {
  // 1. Fetch character rosters
  const killersRes = await fetch(`${API_BASE}/api/v1/killers`);
  assert.strictEqual(killersRes.status, 200);
  const killers = (await killersRes.json()).data;
  assert.ok(killers.length >= 20);

  const survivorsRes = await fetch(`${API_BASE}/api/v1/survivors`);
  assert.strictEqual(survivorsRes.status, 200);
  const survivors = (await survivorsRes.json()).data;
  assert.ok(survivors.length >= 20);

  // 2. Character detail for The Nurse
  let nurseRes = await fetch(`${API_BASE}/api/v1/characters/The_Nurse/detail`);
  if (nurseRes.status === 404) {
    nurseRes = await fetch(`${API_BASE}/api/v1/characters/The%20Nurse/detail`);
  }
  assert.strictEqual(nurseRes.status, 200);
  const nurseData = (await nurseRes.json()).data;
  assert.strictEqual(nurseData.character.name, "The Nurse");
  assert.strictEqual(nurseData.perks.length, 3);
  assert.ok(nurseData.addons.length > 0);

  // 3. Equipment category lookup
  const itemsRes = await fetch(`${API_BASE}/api/v1/items?category=Toolbox`);
  assert.strictEqual(itemsRes.status, 200);
  const items = (await itemsRes.json()).data;
  assert.ok(items.length > 0);

  // 4. Authenticated user generator config & perk draw
  const username = `builder_fe_${Date.now()}`;
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

  // Configure generator
  const configRes = await fetch(`${API_BASE}/api/v1/generator/config`, {
    method: "POST",
    headers: playerHeaders,
    body: JSON.stringify({ role: "Killer", mode: "random", lock_perks: false }),
  });
  assert.strictEqual(configRes.status, 200);

  // Draw perks
  const drawRes = await fetch(`${API_BASE}/api/v1/generator/draw`, {
    method: "POST",
    headers: playerHeaders,
    body: JSON.stringify({ role: "Killer", perks: ["A Nurse's Calling", "Thanatophobia"] }),
  });
  assert.strictEqual(drawRes.status, 200);
  const drawn = (await drawRes.json()).drawn_perks;
  assert.ok(drawn.length >= 2);

  // Reset drawn perks
  const resetRes = await fetch(`${API_BASE}/api/v1/generator/reset`, {
    method: "POST",
    headers: playerHeaders,
    body: JSON.stringify({ role: "Killer" }),
  });
  assert.strictEqual(resetRes.status, 200);
  assert.strictEqual((await resetRes.json()).drawn_perks.length, 0);
});
