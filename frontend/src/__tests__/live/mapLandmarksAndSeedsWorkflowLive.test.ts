import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Map Landmarks, Search & Seed Variants", async () => {
  const searchRes = await fetch(`${API_BASE}/api/v1/maps?search=House`);
  assert.strictEqual(searchRes.status, 200);
  const found = (await searchRes.json()).maps;
  assert.ok(found.length > 0);
});
