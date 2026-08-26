import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Admin Governance & User Management", async () => {
  // 1. Admin login
  const adminLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "lemon", password: "lemon" }),
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const adminToken = (await adminLoginRes.json()).token;
  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  };

  // 2. Admin lists users
  const listRes = await fetch(`${API_BASE}/api/v1/users?page=1&per_page=10`, {
    headers: adminHeaders,
  });
  assert.strictEqual(listRes.status, 200);
  const usersList = (await listRes.json()).users;
  assert.ok(Array.isArray(usersList));

  // 3. Admin creates user directly
  const targetUsername = `managed_fe_${Date.now()}`;
  const createRes = await fetch(`${API_BASE}/api/v1/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      username: targetUsername,
      email: `${targetUsername}@test.com`,
      password: "ManagedPassword123!",
      role: "user",
    }),
  });
  assert.strictEqual(createRes.status, 201);
  const targetUser = (await createRes.json()).user;
  const targetId = targetUser.id;

  // 4. Admin promotes user to admin
  const promoteRes = await fetch(`${API_BASE}/api/v1/users/${targetId}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ role: "admin", is_active: true }),
  });
  assert.strictEqual(promoteRes.status, 200);
  assert.strictEqual((await promoteRes.json()).user.role, "admin");

  // 5. Admin deactivates (bans) user
  const deactRes = await fetch(`${API_BASE}/api/v1/users/${targetId}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ role: "user", is_active: false }),
  });
  assert.strictEqual(deactRes.status, 200);
  assert.strictEqual((await deactRes.json()).user.is_active, false);

  // 6. Deactivated user login fails
  const bannedLogin = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: targetUsername, password: "ManagedPassword123!" }),
  });
  assert.ok(bannedLogin.status === 400 || bannedLogin.status === 401 || bannedLogin.status === 403);

  // 7. Admin queries system stats
  const statsRes = await fetch(`${API_BASE}/api/v1/admin/stats`, { headers: adminHeaders });
  assert.strictEqual(statsRes.status, 200);
  const stats = await statsRes.json();
  assert.ok(typeof stats === "object");

  // 8. Admin deletes user
  const delRes = await fetch(`${API_BASE}/api/v1/users/${targetId}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  assert.strictEqual(delRes.status, 200);

  // 9. Verify audit logs
  const auditRes = await fetch(`${API_BASE}/api/v1/admin/audit-logs`, { headers: adminHeaders });
  assert.strictEqual(auditRes.status, 200);
  const logs = (await auditRes.json()).logs;
  const actions = logs.map((l: any) => l.action);
  assert.ok(actions.includes("user_updated"));
  assert.ok(actions.includes("user_deleted"));
});
