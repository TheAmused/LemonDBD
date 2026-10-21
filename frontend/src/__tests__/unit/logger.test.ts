// frontend/src/__tests__/unit/logger.test.ts
//
// Diagnostics go through utils/logger: one prefix, debug/info dropped in production builds.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'src');
/** Writes console itself: the logger, and the speech runtime that silences a library's console output. */
const ALLOWED = new Set(['utils/logger.ts', 'services/clientSpeechRuntime.ts']);

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('logger', () => {
  it('is the only console writer in production code', () => {
    const offenders = sources(SRC)
      .filter((file) => !ALLOWED.has(path.relative(SRC, file).split(path.sep).join('/')))
      .filter((file) => /\bconsole\.(error|warn|log|info|debug)\(/.test(fs.readFileSync(file, 'utf-8')));
    assert.deepEqual(offenders, []);
  });

  it('prefixes messages and keeps extra arguments', async () => {
    const { logger } = await import('../../utils/logger');
    const seen: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => { seen.push(args); };
    try {
      const err = new Error('boom');
      logger.error('Failed to load', err);
      logger.error(err);
    } finally {
      console.error = original;
    }
    assert.equal(seen[0][0], '[lemondbd] Failed to load');
    assert.ok(seen[0][1] instanceof Error);
    assert.equal(seen[1][0], '[lemondbd]');
    assert.ok(seen[1][1] instanceof Error);
  });

  it('drops debug and info output in production builds', () => {
    const src = fs.readFileSync(path.join(SRC, 'utils', 'logger.ts'), 'utf-8');
    assert.match(src, /NODE_ENV === 'production' \? ORDER\.warn : ORDER\.debug/);
  });
});
