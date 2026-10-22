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
//   4. restores the previous state: the stored override if there was one, else the config default.
// Restoring also happens on Ctrl+C / SIGTERM. A hard kill (SIGKILL, power loss) cannot restore it:
// switch it back in the admin Settings tab.
//
// Env: NEXT_PUBLIC_API_URL (default http://127.0.0.1), LIVE_ADMIN_LOGIN / LIVE_ADMIN_PASSWORD
// (default lemon / lemon), LIVE_KEEP_ALTCHA=1 to leave the setting alone.
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1").replace(/\/+$/, "");
const KEY = "altcha_enforced";
const REASON = "Automated live test run (restored afterwards)";
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

type Json = Record<string, any>;
type SettingRow = { key: string; value: unknown; overridden: boolean };

async function call(path: string, init: RequestInit = {}, token?: string): Promise<{ status: number; body: Json }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Return-Token": "1" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/api/v1${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** Brute-forces one ALTCHA challenge synchronously (50k hashes at most: milliseconds). */
async function solveChallenge(): Promise<Json> {
  const { status, body: ch } = await call("/auth/altcha-challenge");
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
  const payload: Json = { login, password };
  if (withAltcha) payload.altcha = await solveChallenge();
  const { status, body } = await call("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  if (status !== 200 || !body.token) {
    throw new Error(`admin sign-in as "${login}" failed (${status}: ${body.error || body.message || body.status || "no token"})`);
  }
  return body.token;
}

async function currentSetting(token: string): Promise<SettingRow> {
  const { status, body } = await call("/admin/settings", {}, token);
  const row = (body.settings as SettingRow[] | undefined)?.find((s) => s.key === KEY);
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

async function main(): Promise<number> {
  const testArgs = process.argv.slice(2);
  if (testArgs.length === 0) throw new Error("usage: run-live-tests.ts [node --test args] <test files>");

  let restore: (() => Promise<void>) | null = null;
  if (process.env.LIVE_KEEP_ALTCHA !== "1") {
    try {
      const token = await adminToken(true);
      const before = await currentSetting(token);
      if (before.value === false) {
        console.log("[live] ALTCHA is already off; leaving it as is.");
      } else {
        await putSetting(token, false);
        console.log("[live] ALTCHA switched off for this run.");
        restore = async () => {
          let t = token;
          try {
            await currentSetting(t);
          } catch {
            t = await adminToken(false); // the token is gone (a test touched the admin session); ALTCHA is still off here
          }
          await putSetting(t, before.overridden ? Boolean(before.value) : null);
          console.log(`[live] ALTCHA restored (${before.overridden ? `override ${String(before.value)}` : "config default"}).`);
        };
        await waitUntilAltchaIsOff();
      }
    } catch (err) {
      console.error(`[live] cannot prepare the stack at ${API}: ${(err as Error).message}`);
      if (restore) await restore().catch((e) => console.error(`[live] RESTORE FAILED, switch ALTCHA back in Admin > Settings: ${e.message}`));
      return 1;
    }
  }

  const shim = fileURLToPath(new URL("./live-fetch-shim.ts", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", "--import", shim, "--test", ...testArgs], { stdio: "inherit", env: process.env });
  const forward = (sig: NodeJS.Signals) => child.kill(sig);
  process.on("SIGINT", () => forward("SIGINT"));
  process.on("SIGTERM", () => forward("SIGTERM"));
  const code = await new Promise<number>((resolve) => child.on("exit", (c, s) => resolve(c ?? (s ? 1 : 0))));

  if (restore) {
    try {
      await restore();
    } catch (err) {
      console.error(`[live] RESTORE FAILED, switch ALTCHA back in Admin > Settings: ${(err as Error).message}`);
      return code || 1;
    }
  }
  return code;
}

main().then((code) => process.exit(code), (err) => { console.error(`[live] ${err.message}`); process.exit(1); });
