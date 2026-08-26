import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: User Ownership Bulk Cascades", async () => {
  const username = `casc_fe_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email: `${username}@test.com`, password: "Password123!" }),
  });
  assert.strictEqual(regRes.status, 201);
  const { token, user } = await regRes.json();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const charsRes = await fetch(`${API_BASE}/api/v1/users/${user.id}/characters`, { headers });
  assert.strictEqual(charsRes.status, 200);
  const chars = (await charsRes.json()).data;
  assert.ok(chars.length > 0);

  const updates = chars.slice(0, 5).map((c: any) => ({ character_id: c.id, is_owned: true }));
  const bulkRes = await fetch(`${API_BASE}/api/v1/users/${user.id}/characters/bulk`, {
    method: "POST",
    headers,
    body: JSON.stringify({ updates }),
  });
  assert.strictEqual(bulkRes.status, 200);
});
