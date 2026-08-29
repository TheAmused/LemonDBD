// frontend/src/__tests__/live/interactiveMapNavigationWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Interactive Map Navigation & Realms", async () => {
  const mapsRes = await fetch(`${API_BASE}/api/v1/maps`);
  assert.strictEqual(mapsRes.status, 200);
  const maps = (await mapsRes.json()).maps;
  assert.ok(maps.length > 0);

  const detailRes = await fetch(`${API_BASE}/api/v1/maps/coal_tower?seed=seed_a`);
  assert.strictEqual(detailRes.status, 200);
  const mapData = (await detailRes.json()).map;
  assert.ok(mapData.id.includes("coal_tower"), `expected map id to contain "coal_tower", got ${mapData.id}`);
});
