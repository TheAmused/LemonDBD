import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Character Catalog Traversal & Role Filtering", async () => {
  const killersRes = await fetch(`${API_BASE}/api/v1/killers`);
  assert.strictEqual(killersRes.status, 200);
  const killers = (await killersRes.json()).data;
  assert.ok(killers.length >= 30);

  const survRes = await fetch(`${API_BASE}/api/v1/survivors`);
  assert.strictEqual(survRes.status, 200);
  const surv = (await survRes.json()).data;
  assert.ok(surv.length >= 30);
});
