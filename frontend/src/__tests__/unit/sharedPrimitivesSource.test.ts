// frontend/src/__tests__/unit/sharedPrimitivesSource.test.ts
// One source of truth for small UI primitives: these fail if a hand-rolled
// copy of a shared primitive creeps back in.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const FILES = [...walk(path.join(SRC, 'components')), ...walk(path.join(SRC, 'app'))].map((f) => ({
  rel: path.relative(SRC, f).split(path.sep).join('/'),
  src: fs.readFileSync(f, 'utf-8'),
}));

function offenders(test: (f: { rel: string; src: string }) => boolean, allow: string[] = []) {
  return FILES.filter((f) => !allow.includes(f.rel) && test(f)).map((f) => f.rel);
}

test('shared primitives live in components/common only (no root-level shims)', () => {
  for (const name of ['DbdSpinner', 'ImagePreloadProvider', 'ConfirmModal', 'EmptyState', 'Pagination']) {
    assert.ok(fs.existsSync(path.join(SRC, `components/common/${name}.tsx`)), `${name} missing from common/`);
    assert.ok(!fs.existsSync(path.join(SRC, `components/${name}.tsx`)), `${name} must not exist at components/ root`);
  }
});

test('Switch (boolean) and SegmentedControl (choice) are distinct; ToggleSwitch is gone', () => {
  assert.ok(!fs.existsSync(path.join(SRC, 'components/common/ToggleSwitch.tsx')));
  assert.ok(fs.existsSync(path.join(SRC, 'components/common/SegmentedControl.tsx')));
  assert.deepStrictEqual(offenders((f) => /ToggleSwitch/.test(f.src)), []);
});

test('no raw type="checkbox" / role="switch" outside Checkbox and Switch', () => {
  assert.deepStrictEqual(
    offenders((f) => /type="checkbox"|role="switch"/.test(f.src), [
      'components/common/Checkbox.tsx',
      'components/common/Switch.tsx',
      // Whole-row switch button that hosts SwitchTrack (a button cannot nest a Switch).
      'components/onboarding/CharacterOnboardingWizard.tsx',
    ]),
    []
  );
});

test('loading rings use <Spinner>, not a hand-built animate-spin border ring', () => {
  assert.deepStrictEqual(
    offenders((f) => /animate-spin[^"`]*rounded-full[^"`]*border-t-transparent|border-t-transparent[^"`]*animate-spin/.test(f.src), [
      'components/common/Spinner.tsx',
      // Refresh icon that spins only while a reload is in flight (state-toggled, not a loading ring).
      'components/admin/AdminHeader.tsx',
    ]),
    []
  );
  assert.deepStrictEqual(
    offenders((f) => /<(Loader2|RefreshCw)[^>]*animate-spin/.test(f.src), ['components/admin/AdminHeader.tsx']),
    []
  );
});

test('confirmations use ConfirmModal, never window.confirm / alert', () => {
  assert.deepStrictEqual(offenders((f) => /window\.(confirm|alert)\(/.test(f.src)), []);
});

test('Spinner, Skeleton and Checkbox primitives are exported', () => {
  const spinner = fs.readFileSync(path.join(SRC, 'components/common/Spinner.tsx'), 'utf-8');
  const skeleton = fs.readFileSync(path.join(SRC, 'components/common/Skeleton.tsx'), 'utf-8');
  assert.match(spinner, /export const Spinner/);
  assert.match(skeleton, /export const SkeletonBlock/);
});
