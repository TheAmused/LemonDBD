// frontend/src/__tests__/guards/consoleUse.test.ts
//
// Diagnostics go through utils/logger (one prefix, debug/info dropped in production): nothing else
// writes to the console.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../..');
/** Writes console itself: the logger, and the speech runtime that silences a library's console output. */
const ALLOWED = new Set(['utils/logger.ts', 'services/clientSpeechRuntime.ts']);

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('console use', () => {
  it('the logger is the only console writer in production code', () => {
    const offenders = sources(SRC)
      .filter((file) => !ALLOWED.has(path.relative(SRC, file).split(path.sep).join('/')))
      .filter((file) => /\bconsole\.(error|warn|log|info|debug)\(/.test(fs.readFileSync(file, 'utf-8')));
    assert.deepEqual(offenders, []);
  });
});
