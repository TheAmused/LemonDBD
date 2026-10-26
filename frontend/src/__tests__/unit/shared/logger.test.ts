// frontend/src/__tests__/unit/shared/logger.test.ts
//
// Diagnostics go through utils/logger: one prefix, debug/info dropped in production builds.
// (That nothing else writes to the console is a rule: guards/consoleUse.test.ts.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const LOGGER = require.resolve('../../../utils/logger');

/** A fresh copy of the logger module, built with `nodeEnv`, plus what each console method received. */
function loggerUnder(nodeEnv: string | undefined, run: (logger: typeof import('../../../utils/logger').logger) => void) {
  const env = process.env as Record<string, string | undefined>;
  const before = env.NODE_ENV;
  const saved = { debug: console.debug, info: console.info, warn: console.warn, error: console.error };
  const seen: Array<{ level: string; args: unknown[] }> = [];
  env.NODE_ENV = nodeEnv;
  delete require.cache[LOGGER];
  for (const level of ['debug', 'info', 'warn', 'error'] as const) console[level] = (...args: unknown[]) => void seen.push({ level, args });
  try {
    run((require(LOGGER) as typeof import('../../../utils/logger')).logger);
  } finally {
    Object.assign(console, saved);
    env.NODE_ENV = before;
    delete require.cache[LOGGER];
  }
  return seen;
}

describe('logger', () => {
  it('prefixes messages and keeps extra arguments', () => {
    const err = new Error('boom');
    const seen = loggerUnder('development', (logger) => {
      logger.error('Failed to load', err);
      logger.error(err);
    });
    assert.equal(seen[0].args[0], '[lemondbd] Failed to load');
    assert.equal(seen[0].args[1], err);
    assert.equal(seen[1].args[0], '[lemondbd]');
    assert.equal(seen[1].args[1], err);
  });

  it('writes every level outside production', () => {
    const seen = loggerUnder('development', (logger) => {
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');
    });
    assert.deepEqual(seen.map((s) => s.level), ['debug', 'info', 'warn', 'error']);
  });

  it('drops debug and info in production builds; warnings and errors still go through', () => {
    const seen = loggerUnder('production', (logger) => {
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');
    });
    assert.deepEqual(seen.map((s) => s.level), ['warn', 'error']);
  });
});
