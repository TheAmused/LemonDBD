// frontend/src/__tests__/live/adminMultiModeKillswitchWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Admin Multi-Mode Killswitch Governance", async () => {
  const adminLogin = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "lemon", password: "lemon" }),
  });
  assert.strictEqual(adminLogin.status, 200);
  const adminHeaders = {
    Authorization: `Bearer ${(await adminLogin.json()).token}`,
    "Content-Type": "application/json",
  };

  const modesRes = await fetch(`${API_BASE}/api/v1/admin/challenge-modes`, { headers: adminHeaders });
  assert.strictEqual(modesRes.status, 200);
  const modes = (await modesRes.json()).modes;
  assert.ok(Array.isArray(modes));
});
