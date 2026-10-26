// frontend/src/__tests__/live/adminSystemMetricsWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Admin System Metrics & Export", async () => {
  const adminLogin = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: "lemon", password: "lemon" }),
  });
  assert.strictEqual(adminLogin.status, 200);
  const adminHeaders = {
    Authorization: `Bearer ${(await adminLogin.json()).token}`,
    "Content-Type": "application/json",
  };

  const statsRes = await fetch(`${API_BASE}/api/v1/admin/stats`, { headers: adminHeaders });
  assert.strictEqual(statsRes.status, 200);

  // The export is a POST with the targets in the body (it was a GET with a query string).
  const exportRes = await fetch(`${API_BASE}/api/v1/admin/database/export`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ targets: ["perks"] }),
  });
  assert.strictEqual(exportRes.status, 200);
});
