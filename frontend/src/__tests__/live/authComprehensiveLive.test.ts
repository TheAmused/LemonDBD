// frontend/src/__tests__/live/authComprehensiveLive.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { solveAltchaPoW, type AltchaChallenge } from "@/hooks/useAltcha";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1").replace(/\/+$/, '');

test("Live Frontend Integration: ALTCHA Challenge Generation & Solving", async () => {
  const chRes = await fetch(`${API_BASE}/api/v1/auth/altcha-challenge`);
  assert.strictEqual(chRes.status, 200, "ALTCHA challenge endpoint must return 200");
  const challenge: AltchaChallenge = await chRes.json();

  assert.strictEqual(challenge.algorithm, "SHA-256");
  assert.ok(typeof challenge.challenge === "string" && challenge.challenge.length === 64);
  assert.ok(typeof challenge.salt === "string" && challenge.salt.length >= 16);
  assert.ok(typeof challenge.signature === "string" && challenge.signature.length === 64);
  assert.ok(typeof challenge.maxnumber === "number" && challenge.maxnumber > 0);
  assert.ok(challenge.expires > Math.floor(Date.now() / 1000));

  const start = performance.now();
  const solution = await solveAltchaPoW(challenge, 2500);
  const elapsed = performance.now() - start;

  assert.ok(solution !== null, "ALTCHA PoW should solve within max bound");
  assert.strictEqual(solution.challenge, challenge.challenge);
  assert.strictEqual(solution.algorithm, "SHA-256");
  assert.ok(elapsed < 2000, `PoW solution should solve quickly (took ${elapsed.toFixed(1)}ms)`);
});

test("Live Frontend Integration: Demo Accounts Availability & Admin Authentication", async () => {
  const demoRes = await fetch(`${API_BASE}/api/v1/auth/demo-accounts`, { cache: "no-store" });
  assert.strictEqual(demoRes.status, 200, "Demo accounts endpoint must return 200");
  const demoData = await demoRes.json();

  assert.strictEqual(demoData.enabled, true, "Demo accounts must be enabled in development");
  assert.ok(Array.isArray(demoData.accounts) && demoData.accounts.length >= 2);

  const adminAccount = demoData.accounts.find((a: any) => a.role === "admin");
  assert.ok(adminAccount, "Admin demo account must exist");
  assert.strictEqual(adminAccount.login, "lemon");
  assert.strictEqual(adminAccount.password, "lemon");

  // Log in as lemon admin
  const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: adminAccount.login,
      password: adminAccount.password,
    }),
  });
  assert.strictEqual(loginRes.status, 200, "Lemon admin login must succeed");
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.status, "success");
  assert.ok(loginData.token, "JWT token must be returned");
  assert.strictEqual(loginData.user.role, "admin");
  assert.strictEqual(loginData.user.login, "lemon");

  // Verify authenticated profile via /api/v1/auth/me
  const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${loginData.token}`,
      "Content-Type": "application/json",
    },
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.role, "admin");
  assert.strictEqual(meData.user.login, "lemon");
});

test("Live Frontend Integration: User Registration, Login & Bad Credentials Rejection", async () => {
  const ts = Date.now();
  const testLogin = `fe_live_${ts}`;
  const testUsername = `FE_Survivor_${ts}`;
  const testEmail = `fe_user_${ts}@example.com`;
  const testPassword = "LiveTestPassword123!";

  // 1. Solve live ALTCHA PoW
  const chRes = await fetch(`${API_BASE}/api/v1/auth/altcha-challenge`);
  const challenge = await chRes.json();
  const altchaPayload = await solveAltchaPoW(challenge, 2500);
  assert.ok(altchaPayload !== null);

  // 2. Register
  const regRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: testLogin,
      username: testUsername,
      email: testEmail,
      password: testPassword,
      altcha: altchaPayload,
    }),
  });
  assert.strictEqual(regRes.status, 201, "Registration must succeed with 201");
  const regData = await regRes.json();
  assert.strictEqual(regData.user.login, testLogin);
  assert.strictEqual(regData.user.email, testEmail);

  // 3. Login with credentials
  const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: testLogin,
      password: testPassword,
    }),
  });
  assert.strictEqual(loginRes.status, 200, "Login with valid credentials must return 200");

  // 4. Login with email
  const emailLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert.strictEqual(emailLoginRes.status, 200, "Login with email must return 200");

  // 5. Wrong password rejected
  const badLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: testLogin,
      password: "WrongPassword123!",
    }),
  });
  assert.strictEqual(badLoginRes.status, 401, "Invalid password must return 401");

  // 6. Unknown user rejected
  const ghostLoginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: "phantom_user_does_not_exist",
      password: testPassword,
    }),
  });
  assert.strictEqual(ghostLoginRes.status, 401, "Non-existent user must return 401");
});
