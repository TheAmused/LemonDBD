// frontend/src/__tests__/live/apiClientLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Integration: Core DBD Content API", async (t) => {
  await t.test("fetch /api/v1/health returns healthy service", async () => {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "healthy");
  });

  await t.test("fetch /api/v1/perks returns real paginated perks", async () => {
    const res = await fetch(`${API_BASE}/api/v1/perks?limit=25`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.data));
    assert.strictEqual(data.data.length, 25);
    assert.ok(data.pagination.total > 200);
  });

  await t.test("fetch /api/v1/characters returns 50+ real DBD killers and survivors", async () => {
    const res = await fetch(`${API_BASE}/api/v1/characters`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const chars = Array.isArray(data) ? data : data.data;
    assert.ok(chars.length >= 50);
  });

  await t.test("fetch /api/v1/characters/The_Trapper/detail returns powers, perks, addons", async () => {
    let res = await fetch(`${API_BASE}/api/v1/characters/The_Trapper/detail`);
    if (res.status === 404) {
      res = await fetch(`${API_BASE}/api/v1/characters/The%20Trapper/detail`);
    }
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const data = json.data;
    assert.strictEqual(data.character.name, "The Trapper");
    assert.ok(Array.isArray(data.perks));
    assert.ok(data.perks.length > 0);
  });

  await t.test("fetch /api/v1/items and /api/v1/addons returns equipment", async () => {
    const itemsRes = await fetch(`${API_BASE}/api/v1/items`);
    assert.strictEqual(itemsRes.status, 200);
    const items = await itemsRes.json();
    assert.ok((items.data || items).length > 10);

    const addonsRes = await fetch(`${API_BASE}/api/v1/addons`);
    assert.strictEqual(addonsRes.status, 200);
    const addons = await addonsRes.json();
    assert.ok((addons.data || addons).length > 20);
  });

  await t.test("fetch /api/v1/challenge-modes returns admin killswitch states", async () => {
    const res = await fetch(`${API_BASE}/api/v1/challenge-modes`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.modes);
  });
});
