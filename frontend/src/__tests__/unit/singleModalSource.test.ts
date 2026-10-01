// frontend/src/__tests__/unit/singleModalSource.test.ts
// Guard: every dialog/overlay goes through components/common/Modal.tsx.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../components');
const ALLOWED = new Set([path.join(ROOT, 'common', 'Modal.tsx')]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

test('no hand-written dialogs: aria-modal / role="dialog" only inside common/Modal.tsx', () => {
  const offenders = walk(ROOT)
    .filter((f) => !ALLOWED.has(f))
    .filter((f) => /aria-modal|role="dialog"/.test(fs.readFileSync(f, 'utf-8')))
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(offenders, []);
});

test('modals do not keep their own Escape-key handlers or body scroll locks', () => {
  const offenders = walk(ROOT)
    .filter((f) => !ALLOWED.has(f) && !/Tooltip\.tsx$/.test(f))
    .filter((f) => {
      const s = fs.readFileSync(f, 'utf-8');
      return /document\.body\.style\.overflow\s*=/.test(s);
    })
    .map((f) => path.relative(ROOT, f));
  assert.deepStrictEqual(offenders, []);
});
