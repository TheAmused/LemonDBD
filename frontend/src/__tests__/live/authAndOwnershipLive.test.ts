import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Authentication & Character Ownership Cascade", async () => {
  const testUsername = `fe_user_${Date.now()}`;
  const testEmail = `${testUsername}@frontendtest.com`;
  const testPassword = "SecurePassword123!";

  // 1. Register
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      password: testPassword,
    }),
  });
  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  const token = regData.token;
  const userId = regData.user.id;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Login
  const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
    }),
  });
  assert.strictEqual(loginRes.status, 200);

  // 3. /api/v1/auth/me
  const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.username, testUsername);

  // 4. Character Ownership
  const charsRes = await fetch(`${API_BASE}/api/v1/users/${userId}/characters`, {
    headers: authHeaders,
  });
  assert.strictEqual(charsRes.status, 200);
  const chars = (await charsRes.json()).data;
  assert.ok(chars.length > 50);

  const trapper = chars.find((c: any) => c.name === "The Trapper");
  assert.ok(trapper, "The Trapper should exist");
  assert.strictEqual(trapper.is_owned, true, "The Trapper should be free/owned by default");

  // 5. Toggle character lock
  const toggleRes = await fetch(`${API_BASE}/api/v1/users/${userId}/characters`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      character_id: trapper.id,
      is_owned: false,
    }),
  });
  assert.strictEqual(toggleRes.status, 200);

  // 6. Verify perk unlock reflects locked character
  const perksRes = await fetch(`${API_BASE}/api/v1/users/${userId}/perks`, {
    headers: authHeaders,
  });
  assert.strictEqual(perksRes.status, 200);
  const userPerks = (await perksRes.json()).data;
  const trapperPerk = userPerks.find((p: any) => p.character_id === trapper.id);
  if (trapperPerk) {
    assert.strictEqual(trapperPerk.is_unlocked, false);
  }
});
