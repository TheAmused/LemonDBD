// frontend/src/__tests__/live/jwtSecurityAndSessionValidationWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: JWT Security & Tampering Resistance", async () => {
  const username = `jwt_fe_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email: `${username}@test.com`, password: "Password123!" }),
  });
  assert.strictEqual(regRes.status, 201);
  const validToken = (await regRes.json()).token;

  // 1. Valid token passes
  const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${validToken}` },
  });
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual((await meRes.json()).authenticated, true);

  // 2. Tampered token rejected
  const tamperedToken = validToken.slice(0, -5) + "XXXXX";
  const badRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  assert.strictEqual(badRes.status, 200);
  assert.strictEqual((await badRes.json()).authenticated, false);

  // 3. Malformed header rejected
  const malformedRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: "InvalidNoBearerHeader" },
  });
  assert.strictEqual(malformedRes.status, 200);
  assert.strictEqual((await malformedRes.json()).authenticated, false);
});
