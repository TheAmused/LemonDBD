// frontend/src/__tests__/unit/fileLengthGuard.test.ts
//
// No file under frontend/ may be longer than 600 lines. Long files are split, not exempted.
//
// Counted as physical lines (`wc -l` semantics, a final line without a newline included), so
// blank lines and comments count. Not scanned:
//   - dependency / build output: node_modules, .next, out, build, dist, coverage, .turbo, ...
//   - binary files (a NUL byte in the first 8 KiB), e.g. images and fonts
//   - generated files nobody edits by hand: package-lock.json and *.tsbuildinfo
// The backend has the same rule in backend/tests/unit/test_file_length_guard.py.
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_LINES = 600;

const FRONTEND_ROOT = path.resolve(__dirname, '../../..');

const SKIPPED_DIRS = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'node_modules',
  'out',
  'build',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
]);

const GENERATED_FILES = new Set(['package-lock.json']);
const GENERATED_SUFFIXES = ['.tsbuildinfo'];

const isGenerated = (name: string) =>
  GENERATED_FILES.has(name) || GENERATED_SUFFIXES.some((suffix) => name.endsWith(suffix));

/** Physical line count, or null for a binary file. */
function lineCount(file: string): number | null {
  const data = fs.readFileSync(file);
  if (data.subarray(0, 8192).includes(0)) return null;
  if (data.length === 0) return 0;
  let lines = 0;
  for (const byte of data) if (byte === 0x0a) lines += 1;
  return data[data.length - 1] === 0x0a ? lines : lines + 1;
}

/** Posix-style relative path -> line count, for every scanned file longer than `limit`. */
function findOversized(root: string, limit: number = MAX_LINES): Record<string, number> {
  const oversized: Record<string, number> = {};
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && !isGenerated(entry.name)) {
        const lines = lineCount(full);
        if (lines !== null && lines > limit) {
          oversized[path.relative(root, full).split(path.sep).join('/')] = lines;
        }
      }
    }
  };
  walk(root);
  return oversized;
}

describe('file length: frontend', () => {
  it(`no file is longer than ${MAX_LINES} lines`, () => {
    const oversized = findOversized(FRONTEND_ROOT);
    const report = Object.entries(oversized)
      .sort(([, a], [, b]) => b - a)
      .map(([file, lines]) => `  ${file}: ${lines} lines`);
    assert.deepEqual(
      report,
      [],
      `Files over ${MAX_LINES} lines (split them into smaller modules):\n${report.join('\n')}`,
    );
  });
});

describe('file length: guard sanity checks', () => {
  const tmpDirs: string[] = [];
  const makeRoot = (files: Record<string, string | Buffer>) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'file-length-guard-'));
    tmpDirs.push(root);
    for (const [name, content] of Object.entries(files)) {
      const full = path.join(root, name);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    return root;
  };
  const lines = (n: number, ending = '\n') => Array.from({ length: n }, () => 'x').join(ending) + ending;

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('flags a file with 601 lines and reports its length', () => {
    const root = makeRoot({ 'src/big.ts': lines(601) });
    assert.deepEqual(findOversized(root), { 'src/big.ts': 601 });
  });

  it('accepts a file of exactly 600 lines', () => {
    const root = makeRoot({ 'src/ok.ts': lines(600) });
    assert.deepEqual(findOversized(root), {});
  });

  it('counts a last line without a trailing newline', () => {
    const root = makeRoot({ 'a.ts': lines(600).slice(0, -1) + '\nx' });
    assert.deepEqual(findOversized(root), { 'a.ts': 601 });
  });

  it('counts CRLF files the same as LF files', () => {
    const root = makeRoot({ 'crlf.ts': lines(601, '\r\n') });
    assert.deepEqual(findOversized(root), { 'crlf.ts': 601 });
  });

  it('applies to every text file type, JSON included', () => {
    const root = makeRoot({ 'a.css': lines(700), 'b.json': lines(700), 'c.md': lines(700) });
    assert.deepEqual(Object.keys(findOversized(root)).sort(), ['a.css', 'b.json', 'c.md']);
  });

  it('skips dependency and build directories', () => {
    const root = makeRoot({
      'node_modules/pkg/index.js': lines(900),
      '.next/server/page.js': lines(900),
      'coverage/lcov.info': lines(900),
    });
    assert.deepEqual(findOversized(root), {});
  });

  it('skips generated lockfiles and tsbuildinfo', () => {
    const root = makeRoot({ 'package-lock.json': lines(900), 'tsconfig.tsbuildinfo': lines(900) });
    assert.deepEqual(findOversized(root), {});
  });

  it('skips binary files', () => {
    const root = makeRoot({ 'public/blob.bin': Buffer.concat([Buffer.from([0]), Buffer.from(lines(900))]) });
    assert.deepEqual(findOversized(root), {});
  });
});
