// frontend/scripts/run-live-tests.ts
// Runs the live (real API) test files with ALTCHA switched off, then puts the setting back.
//
//   tsx scripts/run-live-tests.ts [node --test args...] <test files / globs>
//
// Why: sign-up and sign-in require a solved ALTCHA challenge, and the switch is an admin runtime
// setting stored in the database (it beats ALTCHA_ENFORCED in .env.dev). The live tests call the
// auth API directly and never solve the widget, so for the run this script
//   1. solves one challenge by hand and signs in as the admin (works whether or not it is enforced),
//   2. sets `altcha_enforced` to false (only when it is currently on),
//   3. runs the tests,
//   4. deletes the accounts the tests registered (the live tests run against the real dev database),
//   5. restores the previous ALTCHA state: the stored override if there was one, else the config default.
// Steps 4-5 also run on Ctrl+C / SIGTERM. What the run changed is written to a state file in the OS
// temp folder first, so after a hard kill (SIGKILL, closed terminal, power loss) the next run
// finishes the cleanup before it starts.
//
// Env: NEXT_PUBLIC_API_URL (default http://127.0.0.1), LIVE_ADMIN_LOGIN / LIVE_ADMIN_PASSWORD
// (default lemon / lemon), LIVE_KEEP_ALTCHA=1 to leave the setting alone, LIVE_KEEP_ACCOUNTS=1 to keep
// the test accounts (to inspect them after a failure).
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1").replace(/\/+$/, "");
const KEY = "altcha_enforced";
const REASON = "Automated live test run (restored afterwards)";
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/** The response fields these scripts read; the API sends more. */
interface ApiBody {
  token?: string;
  error?: string;
  error_code?: string;
  message?: string;
  status?: string | number;
  settings?: SettingRow[];
}
interface AltchaChallenge {
  algorithm: string;
  challenge: string;
  salt: string;
  signature: string;
  expires?: number;
  maxnumber?: number;
}
interface AltchaSolution extends AltchaChallenge {
  number: number;
}
type SettingRow = { key: string; value: unknown; overridden: boolean };

async function call<T = ApiBody>(path: string, init: RequestInit = {}, token?: string): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Return-Token": "1" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/api/v1${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}

/** Brute-forces one ALTCHA challenge synchronously (50k hashes at most: milliseconds). */
async function solveChallenge(): Promise<AltchaSolution> {
  const { status, body: ch } = await call<AltchaChallenge>("/auth/altcha-challenge");
  if (status !== 200) throw new Error(`ALTCHA challenge endpoint returned ${status}`);
  const max = ch.maxnumber || 50000;
  for (let n = 0; n <= max; n++) {
    if (createHash("sha256").update(`${ch.salt}${n}`).digest("hex") === ch.challenge) {
      return { algorithm: ch.algorithm, challenge: ch.challenge, number: n, salt: ch.salt, signature: ch.signature, expires: ch.expires, maxnumber: ch.maxnumber };
    }
  }
  throw new Error("could not solve the ALTCHA challenge");
}

async function adminToken(withAltcha: boolean): Promise<string> {
  const login = process.env.LIVE_ADMIN_LOGIN || "lemon";
  const password = process.env.LIVE_ADMIN_PASSWORD || "lemon";
  const payload: { login: string; password: string; altcha?: AltchaSolution } = { login, password };
  if (withAltcha) payload.altcha = await solveChallenge();
  const { status, body } = await call("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  if (status !== 200 || !body.token) {
    throw new Error(`admin sign-in as "${login}" failed (${status}: ${body.error || body.message || body.status || "no token"})`);
  }
  return body.token;
}

async function currentSetting(token: string): Promise<SettingRow> {
  const { status, body } = await call("/admin/settings", {}, token);
  const row = body.settings?.find((s) => s.key === KEY);
  if (status !== 200 || !row) throw new Error(`could not read the ${KEY} setting (${status})`);
  return row;
}

async function putSetting(token: string, value: boolean | null): Promise<void> {
  const { status, body } = await call("/admin/settings", { method: "PUT", body: JSON.stringify({ settings: { [KEY]: value }, confirm_risky: true, reason: REASON }) }, token);
  if (status !== 200) throw new Error(`could not change ${KEY} (${status}: ${body.error || body.message})`);
}

/** Every gunicorn worker caches settings for a few seconds; wait until a bare login is no longer refused for ALTCHA. */
async function waitUntilAltchaIsOff(): Promise<void> {
  const deadline = Date.now() + 30_000;
  let clean = 0;
  while (Date.now() < deadline) {
    const { body } = await call("/auth/login", { method: "POST", body: "{}" });
    clean = body.error_code === "altcha_failed" ? 0 : clean + 1;
    if (clean >= 5) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("ALTCHA still enforced 30s after switching it off");
}

// ---------------------------------------------------------------------------------------------
// Run state. Written before anything on the stack changes and deleted only after everything is put
// back, so a run that was hard-killed (closed terminal, SIGKILL, power loss) is finished by the
// next one: it restores ALTCHA and removes that run's accounts before starting its own.
// ---------------------------------------------------------------------------------------------
interface RunState {
  api: string;
  /** The runner's process id: a state file whose process is still alive belongs to a run in progress. */
  pid: number;
  startedAt: string;
  /** Highest user id before the run: every account above it was made by the tests. */
  baselineUserId: number;
  /** The ALTCHA setting before the run, or null when this run did not change it. */
  altchaBefore: { overridden: boolean; value: unknown } | null;
}

const STATE_FILE = path.join(os.tmpdir(), `lemondbd-live-tests-${createHash("sha1").update(API).digest("hex").slice(0, 10)}.json`);

function readState(): RunState | null {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as RunState;
  } catch {
    return null;
  }
}
function writeState(state: RunState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function clearState(): void {
  fs.rmSync(STATE_FILE, { force: true });
}
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

// ---------------------------------------------------------------------------------------------
// Test accounts. The live tests register real accounts on the running stack (the dev database, not
// a copy), so every account created during the run is deleted afterwards. Two conditions, both
// required: the id is above the run's baseline AND the e-mail is on a test domain. The second one
// keeps a real sign-up that happens to land during a run (the dev stack can be tunnelled) safe.
// A test that registers with any other domain is reported, not deleted: add its domain here.
// ---------------------------------------------------------------------------------------------
const TEST_EMAIL_DOMAINS = ["example.com", "test.com", "frontendtest.com", "profiletest.com"];

interface UserRow {
  id: number;
  login?: string;
  email?: string;
  role?: string;
}

const isTestEmail = (email: string | undefined) =>
  !!email && TEST_EMAIL_DOMAINS.some((domain) => email.toLowerCase().endsWith(`@${domain}`));

async function highestUserId(token: string): Promise<number> {
  const first = await call<{ total?: number; users?: UserRow[] }>("/users?per_page=1&page=1", {}, token);
  const total = first.body.total ?? 0;
  if (first.status !== 200) throw new Error(`could not list users (${first.status})`);
  if (total === 0) return 0;
  const last = await call<{ users?: UserRow[] }>(`/users?per_page=1&page=${total}`, {}, token);
  return last.body.users?.[0]?.id ?? 0;
}

/** Accounts above `baseline`, newest first (the list is ordered by id, so read it from the end). */
async function usersAbove(token: string, baseline: number): Promise<UserRow[]> {
  const perPage = 100;
  const head = await call<{ total?: number }>("/users?per_page=1&page=1", {}, token);
  let page = Math.max(1, Math.ceil((head.body.total ?? 0) / perPage));
  const found: UserRow[] = [];
  for (; page >= 1; page--) {
    const { status, body } = await call<{ users?: UserRow[] }>(`/users?per_page=${perPage}&page=${page}`, {}, token);
    if (status !== 200) throw new Error(`could not list users (${status})`);
    const rows = body.users ?? [];
    found.push(...rows.filter((u) => u.id > baseline));
    if (rows.length === 0 || rows[0].id <= baseline) break;
  }
  return found;
}

async function deleteTestAccounts(baseline: number): Promise<void> {
  const token = await adminToken(true);
  const created = await usersAbove(token, baseline);
  const ours = created.filter((u) => isTestEmail(u.email) && u.role !== "admin");
  const kept = created.filter((u) => !ours.includes(u));
  let deleted = 0;
  for (const user of ours) {
    const { status } = await call(`/users/${user.id}`, { method: "DELETE" }, token);
    if (status === 200 || status === 404) deleted++;
    else console.error(`[live] could not delete test account #${user.id} (${user.email}): ${status}`);
  }
  console.log(`[live] removed ${deleted} test account(s) created by the run.`);
  if (kept.length) {
    console.warn(
      `[live] left ${kept.length} account(s) made during the run that are not on a test domain or are admins: ` +
        kept.map((u) => `#${u.id} ${u.email ?? "?"}${u.role === "admin" ? " (admin)" : ""}`).join(", ") +
        `. If a test made them, register with one of: ${TEST_EMAIL_DOMAINS.join(", ")}.`,
    );
  }
}

async function restoreAltcha(before: NonNullable<RunState["altchaBefore"]>): Promise<void> {
  const token = await adminToken(true);
  await putSetting(token, before.overridden ? Boolean(before.value) : null);
  console.log(`[live] ALTCHA restored (${before.overridden ? `override ${String(before.value)}` : "config default"}).`);
}

/** Put the stack back as `state` found it. Throws if any part could not be done (the state file is then kept). */
async function finishRun(state: RunState): Promise<void> {
  const problems: string[] = [];
  if (process.env.LIVE_KEEP_ACCOUNTS !== "1") {
    await deleteTestAccounts(state.baselineUserId).catch((e: Error) => problems.push(`account cleanup: ${e.message}`));
  }
  if (state.altchaBefore) {
    await restoreAltcha(state.altchaBefore).catch((e: Error) => problems.push(`ALTCHA restore: ${e.message}`));
  }
  if (problems.length) throw new Error(problems.join("; "));
  clearState();
}

async function main(): Promise<number> {
  const testArgs = process.argv.slice(2);
  if (testArgs.length === 0) throw new Error("usage: run-live-tests.ts [node --test args] <test files>");

  let state: RunState;
  try {
    const leftover = readState();
    if (leftover && leftover.api === API && leftover.pid !== process.pid && isAlive(leftover.pid)) {
      // Two runs on one stack would take each other's accounts for their own and fight over ALTCHA.
      console.error(`[live] another live test run (pid ${leftover.pid}, started ${leftover.startedAt}) is using ${API}. ` +
        `Wait for it to finish, or stop it and delete ${STATE_FILE}.`);
      return 1;
    }
    if (leftover && leftover.api === API) {
      console.warn(`[live] the run started ${leftover.startedAt} did not finish; cleaning up after it first.`);
      await finishRun(leftover);
    }

    const token = await adminToken(true);
    state = { api: API, pid: process.pid, startedAt: new Date().toISOString(), baselineUserId: await highestUserId(token), altchaBefore: null };
    writeState(state);

    if (process.env.LIVE_KEEP_ALTCHA !== "1") {
      const before = await currentSetting(token);
      if (before.value === false) {
        console.log("[live] ALTCHA is already off; leaving it as is.");
      } else {
        state.altchaBefore = { overridden: before.overridden, value: before.value };
        writeState(state); // before the change, so a crash right after it is still recoverable
        await putSetting(token, false);
        console.log("[live] ALTCHA switched off for this run.");
        await waitUntilAltchaIsOff();
      }
    }
  } catch (err) {
    console.error(`[live] cannot prepare the stack at ${API}: ${(err as Error).message}`);
    const pending = readState();
    if (pending && pending.pid === process.pid) {
      await finishRun(pending).catch((e: Error) =>
        console.error(`[live] RESTORE FAILED (${e.message}); the next run retries it, or switch ALTCHA back in Admin > Settings.`),
      );
    }
    return 1;
  }

  const shim = fileURLToPath(new URL("./live-fetch-shim.ts", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", "--import", shim, "--test", ...testArgs], { stdio: "inherit", env: process.env });
  const forward = (sig: NodeJS.Signals) => child.kill(sig);
  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));
  const code = await new Promise<number>((resolve) => child.on("exit", (c, s) => resolve(c ?? (s ? 1 : 0))));

  try {
    await finishRun(state);
  } catch (err) {
    console.error(`[live] RESTORE FAILED (${(err as Error).message}); the next run retries it, or switch ALTCHA back in Admin > Settings.`);
    return code || 1;
  }
  return code;
}

main().then((code) => process.exit(code), (err) => { console.error(`[live] ${err.message}`); process.exit(1); });
