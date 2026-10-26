// .claude/hooks/frontend-check.mjs
// Stop hook: when frontend code changed, run the fast checks on the CHANGED files only -- oxlint, the
// hardcoded-string scan and the global-style scan -- and hand any failure back to Claude instead of
// letting the turn end on red. Seconds, not minutes: the whole-tree guard suites (duplication,
// structure, file length, architecture...) are not run here; they run in `npm run test:guards`, the
// production build and CI. Tests are not run here either: that is `npm run test:changed`.
// Exit 2 = block the stop and show stderr to Claude. Silent when nothing changed or the same state already passed.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const frontend = path.join(root, 'frontend');
const stamp = path.join(os.tmpdir(), `lemondbd-frontend-check-${createHash('sha1').update(root).digest('hex').slice(0, 8)}.txt`);

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {
  // No payload: treat as a plain run.
}
// Claude is already continuing because of this hook, so the check still runs: a half fix must not end the turn
// on red. To stay out of an endless loop on something that cannot be fixed, give up after MAX_BLOCKS in a row.
const MAX_BLOCKS = 3;
const blocks = `${stamp}.blocks`;
const readBlocks = () => (input.stop_hook_active ? Number(fs.readFileSync(blocks, 'utf8')) || 0 : 0);

const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' }).stdout ?? '';
const changed = git(['status', '--porcelain', '--untracked-files=all', '--', 'frontend/src', 'frontend/scripts']).trim();
if (!changed) process.exit(0);

// Changed paths that still exist (a deletion has nothing left to lint).
const paths = changed
  .split('\n')
  .map((line) => line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop())
  .filter((p) => fs.existsSync(path.join(root, p)));

// Fingerprint = the status plus the content of every changed file, so an edit after a pass re-runs the check.
const hash = createHash('sha1').update(changed);
for (const p of paths) {
  try {
    hash.update(fs.readFileSync(path.join(root, p)));
  } catch {
    // A directory: the status line already covers it.
  }
}
const fingerprint = hash.digest('hex');
try {
  if (fs.readFileSync(stamp, 'utf8') === fingerprint) process.exit(0);
} catch {
  // First run.
}

const inFrontend = paths.map((p) => p.replace(/^frontend\//, ''));
const code = inFrontend.filter((p) => /\.(ts|tsx|mjs|js|jsx)$/.test(p));
const components = inFrontend.filter((p) => p.startsWith('src/') && /\.(tsx|jsx)$/.test(p));

const runs = [];
const run = (label, cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: frontend, encoding: 'utf8', shell: process.platform === 'win32', timeout: 120_000 });
  runs.push({ label, ok: r.status === 0, out: `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim() });
};
const bin = (name) => path.join(frontend, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
if (code.length) run('oxlint', bin('oxlint'), ['--format=stylish', ...code]);
if (components.length) {
  run('hardcoded strings', bin('tsx'), ['scripts/check-hardcoded-strings.ts', '--files', components.join(',')]);
  run('global styles', bin('tsx'), ['scripts/check-global-styles.ts', '--files', components.join(',')]);
}

const failed = runs.filter((r) => !r.ok);
if (failed.length === 0) {
  fs.writeFileSync(stamp, fingerprint);
  fs.rmSync(blocks, { force: true });
  process.exit(0);
}
let previous = 0;
try {
  previous = readBlocks();
} catch {
  // No counter yet.
}
if (previous >= MAX_BLOCKS) {
  fs.rmSync(blocks, { force: true });
  process.stderr.write(`Frontend checks still failing after ${MAX_BLOCKS} attempts (${failed.map((f) => f.label).join(', ')}); stopping anyway.\n`);
  process.exit(0);
}
fs.writeFileSync(blocks, String(previous + 1));
const report = failed
  .map((f) => `--- ${f.label} ---\n${f.out.split('\n').slice(-60).join('\n')}`)
  .join('\n\n');
process.stderr.write(`Frontend checks failed on the changed files. Fix what they report (do not raise a baseline or silence a rule):\n\n${report}\n`);
process.exit(2);
