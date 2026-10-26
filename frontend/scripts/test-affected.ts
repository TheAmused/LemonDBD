// frontend/scripts/test-affected.ts
// `npm run test:changed`: run only the unit tests a change can affect, plus the i18n and style scans
// on the changed components. This is the edit-loop command (for people and for AI agents); the
// full suites stay in `npm run test:unit`, `npm run test:guards`, the build and CI.
//
//   npm run test:changed                     working tree + untracked files vs HEAD
//   npm run test:changed -- --since main     everything since the merge-base with main
//   npm run test:changed -- --files a.ts,b.tsx
//   npm run test:changed -- --list           print the selection and why, run nothing
//
// How a test is selected:
//   1. the test file itself changed;
//   2. it imports a changed file, directly or through any chain of imports (`@/` and relative);
//   3. its text names a changed file (`'ScraperConfigModal.tsx'`, `globals.css`): tests that read a
//      file from disk instead of importing it.
// A change to package.json, the lockfile, tsconfig.json or next.config.ts can affect anything, so
// it runs the whole unit suite. Guard suites (src/__tests__/guards) scan the whole tree, so they are
// not selected by this: they run in `npm run test:guards`, the build and CI.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const FRONTEND = path.resolve(__dirname, "..");
const SRC = path.join(FRONTEND, "src");
const UNIT_DIR = "src/__tests__/unit";
const RUN_ALL = new Set(["package.json", "package-lock.json", "tsconfig.json", "next.config.ts"]);
const CODE = /\.(ts|tsx|mts|mjs|js|jsx)$/;
const EXTS = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];

const argv = process.argv.slice(2);
const listOnly = argv.includes("--list");
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1] ?? null;
};

const toFrontendRel = (p: string) => p.replace(/\\/g, "/").replace(/^frontend\//, "");

function git(args: string[]): string[] {
  const out = spawnSync("git", args, { cwd: FRONTEND, encoding: "utf8" });
  if (out.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${out.stderr}`);
  return out.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
}

function changedFiles(): string[] {
  const explicit = flag("--files");
  if (explicit) return explicit.split(",").map(toFrontendRel);
  const since = flag("--since");
  const base = since ? git(["merge-base", since, "HEAD"])[0] : "HEAD";
  // `--relative` makes the paths relative to frontend/ and drops changes outside it.
  const tracked = git(["diff", "--name-only", "--relative", base]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked, ...untracked])].map(toFrontendRel);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") walk(full, out);
    } else if (CODE.test(e.name)) out.push(full);
  }
  return out;
}

const rel = (abs: string) => path.relative(FRONTEND, abs).split(path.sep).join("/");
const IMPORT_RE = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolve(fromRel: string, spec: string, known: Set<string>): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  else return null;
  if (known.has(base)) return base;
  for (const ext of EXTS) if (known.has(base + ext)) return base + ext;
  return null;
}

function main(): number {
  const changed = changedFiles();
  if (changed.length === 0) {
    console.log("[test:changed] no changes in frontend/.");
    return 0;
  }
  const runAll = changed.filter((f) => RUN_ALL.has(f));
  if (runAll.length) {
    console.log(`[test:changed] ${runAll.join(", ")} changed: running the whole unit suite.`);
    if (listOnly) return 0;
    return spawnSync("npm", ["run", "--silent", "test:unit"], { cwd: FRONTEND, stdio: "inherit", shell: true }).status ?? 1;
  }

  // Import graph over src/ (production code, tests and helpers alike), reversed: file -> importers.
  const files = walk(SRC).map(rel);
  const known = new Set(files);
  const importers = new Map<string, Set<string>>();
  const text = new Map<string, string>();
  for (const file of files) {
    const body = fs.readFileSync(path.join(FRONTEND, file), "utf8");
    text.set(file, body);
    for (const m of body.matchAll(IMPORT_RE)) {
      const target = resolve(file, m[1] ?? m[2] ?? m[3] ?? m[4], known);
      if (!target) continue;
      if (!importers.has(target)) importers.set(target, new Set());
      importers.get(target)!.add(file);
    }
  }

  const isUnitTest = (f: string) => f.startsWith(UNIT_DIR + "/") && /\.test\.tsx?$/.test(f);
  const why = new Map<string, string>();

  for (const file of changed) {
    if (isUnitTest(file) && known.has(file)) why.set(file, "changed");
  }
  // Everything that reaches a changed file through imports.
  for (const file of changed) {
    const seen = new Set<string>([file]);
    const queue = [file];
    while (queue.length) {
      const current = queue.shift()!;
      for (const importer of importers.get(current) ?? []) {
        if (seen.has(importer)) continue;
        seen.add(importer);
        queue.push(importer);
        if (isUnitTest(importer) && !why.has(importer)) why.set(importer, `imports ${file}`);
      }
    }
  }
  // Tests that read a changed file from disk name it in a string.
  for (const file of changed) {
    const name = path.posix.basename(file);
    if (name.length < 6) continue;
    for (const [test, body] of text) {
      if (isUnitTest(test) && !why.has(test) && (body.includes(`'${name}'`) || body.includes(`"${name}"`) || body.includes(`/${name}`))) {
        why.set(test, `names ${name}`);
      }
    }
  }

  const tests = [...why.keys()].sort();
  const components = changed.filter((f) => f.startsWith("src/") && /\.(tsx|jsx)$/.test(f) && fs.existsSync(path.join(FRONTEND, f)));

  console.log(`[test:changed] ${changed.length} changed file(s) -> ${tests.length} test file(s):`);
  for (const t of tests) console.log(`  ${t}  (${why.get(t)})`);
  if (components.length) console.log(`[test:changed] scans (i18n, styles) on ${components.length} component file(s).`);
  if (listOnly) return 0;

  let status = 0;
  if (components.length) {
    for (const script of ["scripts/check-hardcoded-strings.ts", "scripts/check-global-styles.ts"]) {
      const r = spawnSync(process.execPath, ["--import", "tsx", script, "--files", components.join(",")], { cwd: FRONTEND, stdio: "inherit" });
      if (r.status !== 0) status = 1;
    }
  }
  if (tests.length) {
    const r = spawnSync(process.execPath, ["--import", "tsx", "--test", ...tests], { cwd: FRONTEND, stdio: "inherit" });
    if (r.status !== 0) status = 1;
  } else {
    console.log("[test:changed] no unit tests depend on these files.");
  }
  return status;
}

process.exit(main());
