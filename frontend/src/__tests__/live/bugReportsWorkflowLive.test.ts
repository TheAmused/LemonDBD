// frontend/src/__tests__/live/bugReportsWorkflowLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

test("Live Frontend Workflow: Bug Report Submission, Triage & Resolution", async () => {
  // 1. Player registers
  const username = `bug_player_${Date.now()}`;
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: `${username}@test.com`,
      password: "Password123!",
    }),
  });
  assert.strictEqual(regRes.status, 201);
  const playerToken = (await regRes.json()).token;
  const playerHeaders = {
    Authorization: `Bearer ${playerToken}`,
    "Content-Type": "application/json",
  };

  // 2. Player submits bug report
  const reportRes = await fetch(`${API_BASE}/api/v1/bug-reports`, {
    method: "POST",
    headers: playerHeaders,
    body: JSON.stringify({
      title: "Ormond Lake Mine Generator Spawn Obstructed",
      message: "A generator spawned inside the mine tunnel without clearance to repair from the south side.",
      category: "Level Design",
      images: [],
    }),
  });
  assert.strictEqual(reportRes.status, 201);
  const report = (await reportRes.json()).report;
  const reportId = report.id;
  assert.strictEqual(report.status, "pending");

  // 3. Player queries own submitted bug reports
  const myReportsRes = await fetch(`${API_BASE}/api/v1/bug-reports/my`, {
    headers: playerHeaders,
  });
  assert.strictEqual(myReportsRes.status, 200);
  const myReports = (await myReportsRes.json()).reports;
  assert.ok(myReports.some((r: any) => r.id === reportId));

  // 4. Admin login
  const adminLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "lemon", password: "lemon" }),
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const adminHeaders = {
    Authorization: `Bearer ${(await adminLoginRes.json()).token}`,
    "Content-Type": "application/json",
  };

  // 5. Admin updates status to in_progress
  const progRes = await fetch(`${API_BASE}/api/v1/admin/bug-reports/${reportId}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({
      status: "in_progress",
      admin_notes: "Forwarded to environment map generation team.",
    }),
  });
  assert.strictEqual(progRes.status, 200);
  assert.strictEqual((await progRes.json()).report.status, "in_progress");

  // 6. Admin resolves ticket
  const resolveRes = await fetch(`${API_BASE}/api/v1/admin/bug-reports/${reportId}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({
      status: "resolved",
      admin_notes: "Adjusted tile generator clearance rules in v2.4.2.",
    }),
  });
  assert.strictEqual(resolveRes.status, 200);
  assert.strictEqual((await resolveRes.json()).report.status, "resolved");

  // 7. Player verifies resolution note in /my
  const myReportsRes2 = await fetch(`${API_BASE}/api/v1/bug-reports/my`, {
    headers: playerHeaders,
  });
  assert.strictEqual(myReportsRes2.status, 200);
  const resolvedItem = (await myReportsRes2.json()).reports.find((r: any) => r.id === reportId);
  assert.ok(resolvedItem);
  assert.strictEqual(resolvedItem.status, "resolved");
  assert.ok(resolvedItem.admin_notes.includes("v2.4.2"));

  // 8. Admin deletes bug report
  const delRes = await fetch(`${API_BASE}/api/v1/admin/bug-reports/${reportId}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  assert.strictEqual(delRes.status, 200);
});
