// frontend/src/__tests__/live/userProfileWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: User Profile Management & Password Security", async () => {
  const username = `prof_fe_${Date.now()}`;
  const email = `${username}@profiletest.com`;
  const initialPassword = "InitialPassword123!";
  const updatedEmail = `updated_${email}`;
  const newPassword = "NewStrongPassword456!";

  // 1. Register
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password: initialPassword }),
  });
  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  const token = regData.token;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Fetch profile via /api/v1/auth/me
  const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.username, username);
  assert.strictEqual(meData.user.email, email);

  // 3. Update profile (email, avatar_url, new password) via PUT /api/v1/auth/profile
  const updateRes = await fetch(`${API_BASE}/api/v1/auth/profile`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      email: updatedEmail,
      avatar_url: "profile_avatar_custom",
      new_password: newPassword,
    }),
  });
  assert.strictEqual(updateRes.status, 200);
  const updatedUser = (await updateRes.json()).user;
  assert.strictEqual(updatedUser.email, updatedEmail);

  // 4. Verify old password fails
  const oldLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: initialPassword }),
  });
  assert.ok(oldLoginRes.status === 400 || oldLoginRes.status === 401);

  // 5. Verify new password succeeds
  const newLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: newPassword }),
  });
  assert.strictEqual(newLoginRes.status, 200);
  const newToken = (await newLoginRes.json()).token;

  // 6. Verify authenticated session with new token
  const meRes2 = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${newToken}` },
  });
  assert.strictEqual(meRes2.status, 200);
  assert.strictEqual((await meRes2.json()).user.email, updatedEmail);
});
