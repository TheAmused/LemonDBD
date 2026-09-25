// frontend/src/__tests__/live/challengeCompletionLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function register(suffix: string) {
  const username = `cc_fe_${suffix}_${Date.now()}`;
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: `${username}@test.com`,
      password: "Password123!",
    }),
  });
  assert.strictEqual(res.status, 201, `register ${username} failed with ${res.status}`);
  const { token } = await res.json();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

async function adminLogin() {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "lemon", password: "lemon" }),
  });
  assert.strictEqual(res.status, 200, `admin login failed with ${res.status}`);
  const { token } = await res.json();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function setMode(
  adminHeaders: Record<string, string>,
  mode: string,
  enabled: boolean,
  reason = "FE Live Trophy Test"
) {
  const body: Record<string, unknown> = { is_enabled: enabled };
  if (enabled === false) body.reason = reason;
  const res = await fetch(`${API_BASE}/api/v1/admin/challenge-modes/${mode}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify(body),
  });
  assert.strictEqual(res.status, 200, `setMode ${mode}=${enabled} failed with ${res.status}`);
}

function isPlainObject(v: unknown): boolean {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// Test 1: fresh user has empty completions
// ---------------------------------------------------------------------------

test("Challenge completion status — fresh user has empty completions", async () => {
  const { headers } = await register("t1");

  const res = await fetch(`${API_BASE}/api/v1/challenge-completions/status`, { headers });
  assert.strictEqual(res.status, 200);
  const body = await res.json();

  assert.ok(isPlainObject(body.completions), "completions should be a plain object");
  assert.ok(!Object.prototype.hasOwnProperty.call(body.completions, "chaos"),        "completions should not have 'chaos'");
  assert.ok(!Object.prototype.hasOwnProperty.call(body.completions, "gauntlet"),     "completions should not have 'gauntlet'");
  assert.ok(!Object.prototype.hasOwnProperty.call(body.completions, "history"),      "completions should not have 'history'");
  assert.ok(!Object.prototype.hasOwnProperty.call(body.completions, "page_streak"),  "completions should not have 'page_streak'");

  assert.ok(isPlainObject(body.active_runs),       "active_runs should be a plain object");
  assert.ok(isPlainObject(body.completion_counts), "completion_counts should be a plain object");
  assert.ok(isPlainObject(body.full_roster),       "full_roster should be a plain object");
});

// ---------------------------------------------------------------------------
// Test 2: gauntlet run creates active_run entry
// ---------------------------------------------------------------------------

test("Challenge completion status — gauntlet run creates active_run entry", async () => {
  const adminHeaders = await adminLogin();
  await setMode(adminHeaders, "gauntlet", true);

  try {
    const { headers } = await register("t2");

    const gauntletRes = await fetch(`${API_BASE}/api/v1/gauntlet-streak/run?role=killer`, { headers });
    assert.strictEqual(gauntletRes.status, 200, `gauntlet run returned ${gauntletRes.status}`);

    const statusRes = await fetch(`${API_BASE}/api/v1/challenge-completions/status`, { headers });
    assert.strictEqual(statusRes.status, 200);
    const body = await statusRes.json();

    assert.ok(
      Array.isArray(body.active_runs?.gauntlet) && body.active_runs.gauntlet.length > 0,
      "active_runs.gauntlet should be a non-empty array"
    );
  } finally {
    await setMode(adminHeaders, "gauntlet", true);
  }
});

// ---------------------------------------------------------------------------
// Test 3: chaos easy run creates active_run entry
// ---------------------------------------------------------------------------

test("Challenge completion status — chaos easy run creates active_run entry", async () => {
  const adminHeaders = await adminLogin();
  await setMode(adminHeaders, "chaos", true);

  try {
    const { headers } = await register("t3");

    const chaosRes = await fetch(`${API_BASE}/api/v1/chaos-streak/run?difficulty=easy`, { headers });
    assert.strictEqual(chaosRes.status, 200, `chaos run returned ${chaosRes.status}`);

    const statusRes = await fetch(`${API_BASE}/api/v1/challenge-completions/status`, { headers });
    assert.strictEqual(statusRes.status, 200);
    const body = await statusRes.json();

    assert.ok(Array.isArray(body.active_runs?.chaos), "active_runs.chaos should be an array");
    assert.ok(
      (body.active_runs.chaos as string[]).includes("easy"),
      "active_runs.chaos should contain 'easy'"
    );
  } finally {
    await setMode(adminHeaders, "chaos", true);
  }
});

// ---------------------------------------------------------------------------
// Test 4: history medium run creates active_run entry
// ---------------------------------------------------------------------------

test("Challenge completion status — history medium run creates active_run entry", async () => {
  const adminHeaders = await adminLogin();
  await setMode(adminHeaders, "history", true);

  try {
    const { headers } = await register("t4");

    const histRes = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=medium`, { headers });
    assert.strictEqual(histRes.status, 200, `history run returned ${histRes.status}`);

    const statusRes = await fetch(`${API_BASE}/api/v1/challenge-completions/status`, { headers });
    assert.strictEqual(statusRes.status, 200);
    const body = await statusRes.json();

    assert.ok(Array.isArray(body.active_runs?.history), "active_runs.history should be an array");
    assert.ok(
      (body.active_runs.history as string[]).includes("medium"),
      "active_runs.history should contain 'medium'"
    );
  } finally {
    await setMode(adminHeaders, "history", true);
  }
});

// ---------------------------------------------------------------------------
// Test 5: disabled chaos blocks new run; error says disabled; re-enable unblocks
// ---------------------------------------------------------------------------

test("Killswitch — disabled chaos mode blocks new run and error says disabled", async () => {
  const adminHeaders = await adminLogin();

  const disRes = await fetch(`${API_BASE}/api/v1/admin/challenge-modes/chaos`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ is_enabled: false, reason: "FE Live Trophy Test" }),
  });
  assert.strictEqual(disRes.status, 200, `disable chaos returned ${disRes.status}`);

  try {
    const { headers } = await register("t5");

    const blockedRes = await fetch(`${API_BASE}/api/v1/chaos-streak/run?difficulty=easy`, { headers });
    assert.strictEqual(blockedRes.status, 400, `expected 400 when chaos disabled, got ${blockedRes.status}`);
    const blockedBody = await blockedRes.json();
    assert.ok(
      typeof blockedBody.error === "string" && blockedBody.error.toLowerCase().includes("disabled"),
      `error message should contain 'disabled', got: ${blockedBody.error}`
    );

    // Re-enable inside try so we can verify unblocking with the same user
    await fetch(`${API_BASE}/api/v1/admin/challenge-modes/chaos`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ is_enabled: true }),
    });

    const unlockedRes = await fetch(`${API_BASE}/api/v1/chaos-streak/run?difficulty=easy`, { headers });
    assert.strictEqual(unlockedRes.status, 200, `expected 200 after re-enable, got ${unlockedRes.status}`);
  } finally {
    // Guarantee re-enable even if re-enable above threw
    await fetch(`${API_BASE}/api/v1/admin/challenge-modes/chaos`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ is_enabled: true }),
    });
  }
});

// ---------------------------------------------------------------------------
// Test 6: disabled history blocks hell difficulty; re-enable unblocks
// ---------------------------------------------------------------------------

test("Killswitch — disabled history blocks hell difficulty too", async () => {
  const adminHeaders = await adminLogin();

  const disRes = await fetch(`${API_BASE}/api/v1/admin/challenge-modes/history`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ is_enabled: false, reason: "FE Live Trophy Test" }),
  });
  assert.strictEqual(disRes.status, 200, `disable history returned ${disRes.status}`);

  try {
    const { headers } = await register("t6");

    const blockedRes = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=hell`, { headers });
    assert.strictEqual(blockedRes.status, 400, `expected 400 when history disabled, got ${blockedRes.status}`);
    const blockedBody = await blockedRes.json();
    assert.ok(
      typeof blockedBody.error === "string" && blockedBody.error.toLowerCase().includes("disabled"),
      `error message should contain 'disabled', got: ${blockedBody.error}`
    );

    // Re-enable and verify unblocking with the same user
    await fetch(`${API_BASE}/api/v1/admin/challenge-modes/history`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ is_enabled: true }),
    });

    const unlockedRes = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=hell`, { headers });
    assert.strictEqual(unlockedRes.status, 200, `expected 200 after re-enable, got ${unlockedRes.status}`);
  } finally {
    await fetch(`${API_BASE}/api/v1/admin/challenge-modes/history`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ is_enabled: true }),
    });
  }
});

// ---------------------------------------------------------------------------
// Test 7: hell difficulty accessible for chaos
// ---------------------------------------------------------------------------

test("Difficulty cascade — hell mode accessible for chaos", async () => {
  const { headers } = await register("t7");

  const res = await fetch(`${API_BASE}/api/v1/chaos-streak/run?difficulty=hell`, { headers });
  assert.strictEqual(res.status, 200, `chaos hell run returned ${res.status}`);
  const body = await res.json();

  assert.ok(body.run !== undefined, "response should have a 'run' key");
  assert.ok(body.run?.id, "run should have an 'id' field");
});

// ---------------------------------------------------------------------------
// Test 8: hell mode accessible for history
// ---------------------------------------------------------------------------

test("Difficulty cascade — hell mode accessible for history", async () => {
  const { headers } = await register("t8");

  const res = await fetch(`${API_BASE}/api/v1/history-streak/run?mode=hell`, { headers });
  assert.strictEqual(res.status, 200, `history hell run returned ${res.status}`);
  const body = await res.json();

  // Accept either body.run.id or body.id as the run identifier
  const hasId = body.run?.id ?? body.id;
  assert.ok(hasId, "response should contain a run id field");
});

// ---------------------------------------------------------------------------
// Test 9: completion_counts and full_roster are correct shapes
// ---------------------------------------------------------------------------

test("Completion status — completion_counts and full_roster are correct shapes", async () => {
  const adminHeaders = await adminLogin();

  try {
    await setMode(adminHeaders, "gauntlet", true);
    await setMode(adminHeaders, "chaos", true);

    const { headers } = await register("t9");

    // Start a gauntlet and a chaos run to populate the status
    await fetch(`${API_BASE}/api/v1/gauntlet-streak/run?role=killer`, { headers });
    await fetch(`${API_BASE}/api/v1/chaos-streak/run?difficulty=easy`, { headers });

    const res = await fetch(`${API_BASE}/api/v1/challenge-completions/status`, { headers });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    // All four top-level keys must exist
    assert.ok("completions"       in body, "body should have 'completions'");
    assert.ok("active_runs"       in body, "body should have 'active_runs'");
    assert.ok("completion_counts" in body, "body should have 'completion_counts'");
    assert.ok("full_roster"       in body, "body should have 'full_roster'");

    // Each must be a plain object
    assert.ok(isPlainObject(body.completions),       "completions should be a plain object");
    assert.ok(isPlainObject(body.active_runs),       "active_runs should be a plain object");
    assert.ok(isPlainObject(body.completion_counts), "completion_counts should be a plain object");
    assert.ok(isPlainObject(body.full_roster),       "full_roster should be a plain object");

    // If chaos counts exist they must be a plain object (not an array)
    if (body.completion_counts.chaos !== undefined) {
      assert.ok(
        isPlainObject(body.completion_counts.chaos),
        "completion_counts.chaos should be a plain object, not an array"
      );
    }
  } finally {
    await setMode(adminHeaders, "gauntlet", true);
    await setMode(adminHeaders, "chaos", true);
  }
});

// ---------------------------------------------------------------------------
// Test 10: page streak roster — ever_completed false for new user
// ---------------------------------------------------------------------------

test("Page streak roster — ever_completed false for new user", async () => {
  const { headers } = await register("t10");

  const rosterRes = await fetch(`${API_BASE}/api/v1/page-streak/roster`, { headers });
  assert.strictEqual(rosterRes.status, 200);
  const rosterBody = await rosterRes.json();

  const data: unknown[] = rosterBody.data;
  assert.ok(Array.isArray(data) && data.length > 0, "data should be a non-empty array");

  for (const entry of data as Record<string, unknown>[]) {
    assert.ok("killer"         in entry, "each entry should have 'killer'");
    assert.ok("status"         in entry, "each entry should have 'status'");
    assert.ok("ever_completed" in entry, "each entry should have 'ever_completed'");
    assert.strictEqual(entry.ever_completed, false, `expected ever_completed=false, got ${entry.ever_completed}`);
  }

  const statusRes = await fetch(`${API_BASE}/api/v1/challenge-completions/status`, { headers });
  assert.strictEqual(statusRes.status, 200);
  const statusBody = await statusRes.json();

  assert.ok(
    !Object.prototype.hasOwnProperty.call(statusBody.completions, "page_streak"),
    "completions should not contain 'page_streak' for a new user"
  );
});
