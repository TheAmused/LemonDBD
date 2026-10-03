// frontend/src/__tests__/helpers/ratchet.ts
//
// "No new debt" assertions for checks the codebase doesn't satisfy yet. The accepted
// state lives in baselines/<name>.json (id -> count). A test fails when anything gets
// WORSE (new id, or a higher count) and also when anything gets BETTER without the
// baseline being tightened, so the numbers can only go down.
//
// Refresh after fixing debt:  UPDATE_BASELINES=1 npx tsx --test src/__tests__/unit/<file>
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const DIR = path.resolve(__dirname, '../baselines');

export type Counts = Record<string, number>;

export function countBy(ids: string[]): Counts {
  const out: Counts = {};
  for (const id of ids) out[id] = (out[id] ?? 0) + 1;
  return out;
}

export function ratchet(name: string, current: Counts, what: string): void {
  const file = path.join(DIR, `${name}.json`);
  const sorted = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  if (process.env.UPDATE_BASELINES) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
    return;
  }
  const base: Counts = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const worse = Object.entries(current).filter(([id, n]) => n > (base[id] ?? 0));
  assert.deepEqual(
    worse.map(([id, n]) => `${id}: ${n} (allowed ${base[id] ?? 0})`),
    [],
    `New ${what}. Fix them (do not raise the baseline):`
  );
  const better = Object.entries(base).filter(([id, n]) => (current[id] ?? 0) < n);
  assert.deepEqual(
    better.map(([id, n]) => `${id}: ${current[id] ?? 0} (baseline ${n})`),
    [],
    `${what} went down. Lock it in: UPDATE_BASELINES=1 npx tsx --test <this file>`
  );
}
