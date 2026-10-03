// frontend/src/__tests__/unit/codeQualityGuards.test.ts
//
// Code-quality guards over production code. Anything the codebase doesn't satisfy yet is held
// by a ratchet (baselines/*.json): it may only shrink, never grow.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ts } from 'ts-morph';
import {
  codeModules,
  scanAst,
  scanLines,
  isEntry,
  findCycles,
  exportsOf,
  usedExports,
  loadModules,
} from '../helpers/sourceGraph';
import { ratchet, countBy } from '../helpers/ratchet';

const perFile = (hits: string[]) => countBy(hits.map((h) => h.split(':')[0]));

describe('code quality: type and lint escape hatches', () => {
  it('no @ts-ignore / @ts-expect-error / @ts-nocheck anywhere', () => {
    const bad = scanLines(/@ts-(ignore|expect-error|nocheck)/);
    assert.deepEqual(bad, [], `Type-check suppressions:\n${bad.join('\n')}`);
  });

  it('eslint-disable directives only shrink', () => {
    ratchet('eslintDisable', perFile(scanLines(/eslint-disable/)), 'eslint-disable directives');
  });

  it('`any` only shrinks (annotations, assertions, generics)', () => {
    const bad = scanAst((n) => n.kind === ts.SyntaxKind.AnyKeyword);
    ratchet('anyUsage', perFile(bad), "uses of `any`");
  });
});

describe('code quality: noise in production code', () => {
  it('no console.log (console.warn / console.error are allowed for real failures)', () => {
    const bad = scanLines(/console\.log\(/);
    assert.deepEqual(bad, [], `console.log in production code:\n${bad.join('\n')}`);
  });

  it('console.debug only shrinks', () => {
    ratchet('consoleDebug', perFile(scanLines(/console\.debug\(/)), 'console.debug calls');
  });

  it('no TODO / FIXME / HACK / XXX markers', () => {
    const bad = scanLines(/\b(TODO|FIXME|HACK|XXX)\b/);
    assert.deepEqual(bad, [], `Unfinished-work markers:\n${bad.join('\n')}`);
  });

  it('no commented-out code', () => {
    const re = /^\s*\/\/ (const |let |var |import |export |return\b|await |if \(|for \(|<\/?[A-Z]\w*[\s>/])[^]*[;{})]\s*$/;
    const bad = scanLines(re);
    assert.deepEqual(bad, [], `Commented-out code (delete it, git remembers):\n${bad.join('\n')}`);
  });
});

describe('code quality: size', () => {
  const MAX_LINES = 600;
  it(`no module may grow past ${MAX_LINES} lines; existing giants only shrink`, () => {
    const big: Record<string, number> = {};
    for (const m of codeModules()) if (m.lines.length > MAX_LINES) big[m.file] = Math.ceil(m.lines.length / 50) * 50;
    // Rounded up to 50 so ordinary edits don't churn the baseline, but real growth does.
    ratchet('fileSize', big, `modules over ${MAX_LINES} lines (or grown)`);
  });
});

describe('code quality: dead code and structure', () => {
  it('no import cycles between modules', () => {
    const cycles = findCycles().map((c) => c.join(' <-> '));
    assert.deepEqual(cycles, [], `Import cycles:\n${cycles.join('\n')}`);
  });

  it('every module is reachable from an App Router entry (no dead files)', () => {
    const mods = loadModules();
    const by = new Map(mods.map((m) => [m.file, m]));
    const seen = new Set<string>();
    const stack = mods.filter((m) => isEntry(m.file)).map((m) => m.file);
    while (stack.length) {
      const f = stack.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      const m = by.get(f);
      if (m) stack.push(...m.staticImports, ...m.typeImports, ...m.dynamicImports);
    }
    const dead = codeModules().filter((m) => !seen.has(m.file));
    assert.deepEqual(dead.map((m) => m.file), [], 'Files no entry point can reach (delete them):');
  });

  it('every export is imported somewhere (production code or tests)', () => {
    const used = usedExports();
    const unused: string[] = [];
    for (const m of codeModules()) {
      if (isEntry(m.file)) continue;
      const u = used.get(m.file);
      if (u?.has('*')) continue;
      for (const e of exportsOf(m)) if (!u?.has(e.name)) unused.push(`${m.file}#${e.name}`);
    }
    ratchet('unusedExports', countBy(unused), 'unused exports');
  });
});
