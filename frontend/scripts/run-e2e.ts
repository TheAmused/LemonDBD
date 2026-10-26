// frontend/scripts/run-e2e.ts
// Runs the browser journeys (e2e/*.e2e.ts) against the running stack with the sign-up gates switched
// off, then puts everything back.
//
//   tsx scripts/run-e2e.ts [node --test args...] <test files / globs>
//
// Why: sign-up and sign-in require a solved ALTCHA challenge, and a new account must confirm its
// e-mail before it can sign in. Both switches are admin runtime settings stored in the database
// (they beat ALTCHA_ENFORCED in .env.dev). The journeys register throwaway accounts and cannot read
// a confirmation mail, so for the run this script
//   1. solves one challenge by hand and signs in as the admin (works whether or not it is enforced),
//   2. turns `altcha_enforced` and `email_verification_required` off (only those that are on),
//   3. runs the journeys,
//   4. deletes the accounts the journeys registered (they run against the real dev database),
//   5. restores each switch: the stored override if there was one, else the config default.
// Steps 4-5 also run on Ctrl+C / SIGTERM. What the run changed is written to a state file in the OS
// temp folder first, so after a hard kill (SIGKILL, closed terminal, power loss) the next run
// finishes the cleanup before it starts.
//
// Env: E2E_BASE_URL or NEXT_PUBLIC_API_URL (default https://localhost), LIVE_ADMIN_LOGIN /
// LIVE_ADMIN_PASSWORD (default lemon / lemon), LIVE_KEEP_SETTINGS=1 to leave the switches alone,
// LIVE_KEEP_ACCOUNTS=1 to keep the test accounts (to inspect them after a failure).
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const API = (process.env.E2E_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "https://localhost").replace(/\/+$/, "");
/** The runtime settings switched off for the run, in this order, and restored afterwards. */
const SWITCHES = ["altcha_enforced", "email_verification_required"] as const;
type SwitchKey = (typeof SWITCHES)[number];
const REASON = "Automated e2e run (restored afterwards)";
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

async function currentSetting(token: string, key: SwitchKey): Promise<SettingRow> {
  const { status, body } = await call("/admin/settings", {}, token);
  const row = body.settings?.find((s) => s.key === key);
  if (status !== 200 || !row) throw new Error(`could not read the ${key} setting (${status})`);
  return row;
}

async function putSetting(token: string, key: SwitchKey, value: boolean | null): Promise<void> {
  const { status, body } = await call("/admin/settings", { method: "PUT", body: JSON.stringify({ settings: { [key]: value }, confirm_risky: true, reason: REASON }) }, token);
  if (status !== 200) throw new Error(`could not change ${key} (${status}: ${body.error || body.message})`);
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

/** Other switches have no cheap probe: wait out the settings cache (SITE_SETTINGS_CACHE_SECONDS, 5 s). */
const waitForSettingsCache = () => new Promise((r) => setTimeout(r, 6_000));

// ---------------------------------------------------------------------------------------------
// Run state. Written before anything on the stack changes and deleted only after everything is put
// back, so a run that was hard-killed (closed terminal, SIGKILL, power loss) is finished by the
// next one: it restores the switches and removes that run's accounts before starting its own.
// ---------------------------------------------------------------------------------------------
interface RunState {
  api: string;
  /** The runner's process id: a state file whose process is still alive belongs to a run in progress. */
  pid: number;
  startedAt: string;
  /** Highest user id before the run: every account above it was made by the tests. */
  baselineUserId: number;
  /** Each switch this run turned off, as it was before. A switch that was already off is not listed. */
  settingsBefore: Partial<Record<SwitchKey, { overridden: boolean; value: unknown }>>;
  /** Written by the old run-live-tests.ts (ALTCHA only); still read so its leftover state is finished. */
  altchaBefore?: { overridden: boolean; value: unknown } | null;
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
// Test accounts. The journeys register real accounts on the running stack (the dev database, not
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

async function restoreSettings(before: RunState["settingsBefore"]): Promise<void> {
  const token = await adminToken(true);
  for (const key of SWITCHES) {
    const was = before[key];
    if (!was) continue;
    await putSetting(token, key, was.overridden ? Boolean(was.value) : null);
    console.log(`[live] ${key} restored (${was.overridden ? `override ${String(was.value)}` : "config default"}).`);
  }
}

/** Put the stack back as `state` found it. Throws if any part could not be done (the state file is then kept). */
async function finishRun(state: RunState): Promise<void> {
  const problems: string[] = [];
  if (process.env.LIVE_KEEP_ACCOUNTS !== "1") {
    await deleteTestAccounts(state.baselineUserId).catch((e: Error) => problems.push(`account cleanup: ${e.message}`));
  }
  const before = { ...state.settingsBefore };
  if (state.altchaBefore && !before.altcha_enforced) before.altcha_enforced = state.altchaBefore;
  if (Object.keys(before).length) {
    await restoreSettings(before).catch((e: Error) => problems.push(`settings restore: ${e.message}`));
  }
  if (problems.length) throw new Error(problems.join("; "));
  clearState();
}

async function main(): Promise<number> {
  const testArgs = process.argv.slice(2);
  if (testArgs.length === 0) throw new Error("usage: run-e2e.ts [node --test args] <test files>");

  let state: RunState;
  try {
    const leftover = readState();
    if (leftover && leftover.api === API && leftover.pid !== process.pid && isAlive(leftover.pid)) {
      // Two runs on one stack would take each other's accounts for their own and fight over the switches.
      console.error(`[live] another e2e run (pid ${leftover.pid}, started ${leftover.startedAt}) is using ${API}. ` +
        `Wait for it to finish, or stop it and delete ${STATE_FILE}.`);
      return 1;
    }
    if (leftover && leftover.api === API) {
      console.warn(`[live] the run started ${leftover.startedAt} did not finish; cleaning up after it first.`);
      await finishRun(leftover);
    }

    const token = await adminToken(true);
    state = { api: API, pid: process.pid, startedAt: new Date().toISOString(), baselineUserId: await highestUserId(token), settingsBefore: {} };
    writeState(state);

    if (process.env.LIVE_KEEP_SETTINGS !== "1") {
      for (const key of SWITCHES) {
        const before = await currentSetting(token, key);
        if (before.value === false) {
          console.log(`[live] ${key} is already off; leaving it as is.`);
          continue;
        }
        state.settingsBefore[key] = { overridden: before.overridden, value: before.value };
        writeState(state); // before the change, so a crash right after it is still recoverable
        await putSetting(token, key, false);
        console.log(`[live] ${key} switched off for this run.`);
      }
      if (state.settingsBefore.altcha_enforced) await waitUntilAltchaIsOff();
      if (state.settingsBefore.email_verification_required) await waitForSettingsCache();
    }
  } catch (err) {
    console.error(`[live] cannot prepare the stack at ${API}: ${(err as Error).message}`);
    const pending = readState();
    if (pending && pending.pid === process.pid) {
      await finishRun(pending).catch((e: Error) =>
        console.error(`[live] RESTORE FAILED (${e.message}); the next run retries it, or switch the settings back in Admin > Settings.`),
      );
    }
    return 1;
  }

  const child = spawn(process.execPath, ["--import", "tsx", "--test", ...testArgs], { stdio: "inherit", env: { ...process.env, E2E_BASE_URL: API } });
  const forward = (sig: NodeJS.Signals) => child.kill(sig);
  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));
  const code = await new Promise<number>((resolve) => child.on("exit", (c, s) => resolve(c ?? (s ? 1 : 0))));

  try {
    await finishRun(state);
  } catch (err) {
    console.error(`[live] RESTORE FAILED (${(err as Error).message}); the next run retries it, or switch the settings back in Admin > Settings.`);
    return code || 1;
  }
  return code;
}

main().then((code) => process.exit(code), (err) => { console.error(`[live] ${err.message}`); process.exit(1); });
