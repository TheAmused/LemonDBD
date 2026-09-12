// frontend/src/__tests__/live/interactiveMapNavigationWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Interactive Map Navigation & Realms", async () => {
  const mapsRes = await fetch(`${API_BASE}/api/v1/maps`);
  assert.strictEqual(mapsRes.status, 200);
  const maps = (await mapsRes.json()).maps;
  assert.ok(maps.length > 0);

  const macmillanRes = await fetch(`${API_BASE}/api/v1/maps?realm=${encodeURIComponent("The MacMillan Estate")}`);
  assert.strictEqual(macmillanRes.status, 200);
  const macMaps = (await macmillanRes.json()).maps;
  assert.ok(macMaps.length > 0);
});
