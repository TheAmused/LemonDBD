// .claude/hooks/frontend-check.mjs
// Stop hook: when frontend code changed, run `npm run check` (hardcoded strings, global styles, duplication and
// structure guards) and hand any failure back to Claude instead of letting the turn end on red.
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
// Claude is already continuing because of this hook; do not loop.
if (input.stop_hook_active) process.exit(0);

const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' }).stdout ?? '';
const changed = git(['status', '--porcelain', '--', 'frontend/src', 'frontend/scripts', 'frontend/package.json']).trim();
if (!changed) process.exit(0);

// Fingerprint = the status plus the content of every changed file, so an edit after a pass re-runs the check.
const hash = createHash('sha1').update(changed);
for (const line of changed.split('\n')) {
  const file = path.join(root, line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
  try {
    hash.update(fs.readFileSync(file));
  } catch {
    // Deleted or a directory: the status line already covers it.
  }
}
const fingerprint = hash.digest('hex');
try {
  if (fs.readFileSync(stamp, 'utf8') === fingerprint) process.exit(0);
} catch {
  // First run.
}

const run = spawnSync('npm', ['run', 'check'], { cwd: frontend, encoding: 'utf8', shell: true, timeout: 280_000 });
if (run.status === 0) {
  fs.writeFileSync(stamp, fingerprint);
  process.exit(0);
}
const tail = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim().split('\n').slice(-80).join('\n');
process.stderr.write(`npm run check failed in frontend/. Fix what it reports (do not raise a baseline or silence a guard):\n\n${tail}\n`);
process.exit(2);
