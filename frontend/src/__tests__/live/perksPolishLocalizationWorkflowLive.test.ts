import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Perks Catalog Polish Localization & Search", async () => {
  // 1. Fetch paginated perks
  const res = await fetch(`${API_BASE}/api/v1/perks?limit=50&page=1`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.data.length > 0);
  assert.ok(data.pagination.total >= 200);

  // 2. Filter by category (Killer vs Survivor)
  const killerRes = await fetch(`${API_BASE}/api/v1/perks?category=Killer&limit=20`);
  assert.strictEqual(killerRes.status, 200);
  const killerPerks = (await killerRes.json()).data;
  assert.ok(killerPerks.every((p: any) => p.category === "Killer" || p.role === "Killer"));

  // 3. Search keyword
  const searchRes = await fetch(`${API_BASE}/api/v1/perks?search=Calling`);
  assert.strictEqual(searchRes.status, 200);
  const found = (await searchRes.json()).data;
  assert.ok(found.some((p: any) => p.name.includes("Calling")));
});
